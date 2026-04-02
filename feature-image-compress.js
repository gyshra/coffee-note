// ============================================================
// feature-image-compress.js
// 이미지 압축 + EXIF Orientation 방어
//
// [HTML 삽입 위치] common.js 뒤, feature-global-search.js 앞에:
//   <script src="common.js"></script>
//   <script src="feature-image-compress.js"></script>
//   <script src="feature-global-search.js"></script>
//
// [공개 API]
//   await CoffeeNote.compressImage(file, { maxSize, quality })
//   → 반환: data:image/jpeg;base64,... (base64 문자열)
//
// [EXIF 방어 전략]
//   최신 브라우저(Chrome 81+, Safari 13.1+, Firefox 78+)는
//   createImageBitmap + <img>에서 EXIF orientation을 자동 적용한다.
//   이 모듈은 createImageBitmap이 있으면 이를 우선 사용하고,
//   없는 구형 브라우저용으로 수동 EXIF 파싱 폴백을 포함한다.
// ============================================================

(function () {
    'use strict';
  
    var ns = (window.CoffeeNote = window.CoffeeNote || {});
  
    /**
     * @param {File} file
     * @param {Object} [opts]
     * @param {number} [opts.maxSize=1024]   - 가로/세로 최대 px
     * @param {number} [opts.quality=0.7]    - JPEG 품질 (0~1)
     * @returns {Promise<string>}            - data:image/jpeg;base64,...
     */
    async function compressImage(file, opts) {
      var maxSize = (opts && opts.maxSize) || 1024;
      var quality = (opts && opts.quality) || 0.7;
  
      // ── 1단계: 이미지 소스 생성 (EXIF 자동 보정) ──
      var source;
  
      if (typeof createImageBitmap === 'function') {
        // ★ 최신 브라우저: createImageBitmap이 EXIF orientation을 자동 적용
        //    imageOrientation: 'from-image' 옵션으로 명시적 보장
        try {
          source = await createImageBitmap(file, {
            imageOrientation: 'from-image'
          });
        } catch (_e) {
          // 옵션 미지원 브라우저 → 옵션 없이 재시도
          source = await createImageBitmap(file);
        }
      } else {
        // ── 구형 브라우저 폴백: 수동 EXIF 읽기 + 회전 ──
        source = await _loadImageWithExifFallback(file);
      }
  
      // ── 2단계: Canvas 리사이즈 ──
      var sw = source.width;
      var sh = source.height;
      var scale = 1;
  
      if (sw > maxSize || sh > maxSize) {
        scale = maxSize / Math.max(sw, sh);
      }
  
      var dw = Math.round(sw * scale);
      var dh = Math.round(sh * scale);
  
      var canvas = document.createElement('canvas');
      canvas.width = dw;
      canvas.height = dh;
  
      var ctx = canvas.getContext('2d');
      ctx.drawImage(source, 0, 0, dw, dh);
  
      // ImageBitmap은 사용 후 close해야 메모리 해제
      if (source.close) source.close();
  
      // ── 3단계: JPEG base64 반환 ──
      return canvas.toDataURL('image/jpeg', quality);
    }
  
  
    // ── 구형 브라우저 폴백: EXIF orientation 수동 처리 ──
  
    /**
     * FileReader → Image 로드 후, EXIF orientation에 따라 Canvas에서 회전
     * @param {File} file
     * @returns {Promise<HTMLCanvasElement>}  — drawImage 소스로 사용 가능
     */
    function _loadImageWithExifFallback(file) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onerror = reject;
        reader.onload = function () {
          var arrayBuffer = reader.result;
          var orientation = _readExifOrientation(arrayBuffer);
  
          var blob = new Blob([arrayBuffer], { type: file.type });
          var url = URL.createObjectURL(blob);
          var img = new Image();
          img.onload = function () {
            URL.revokeObjectURL(url);
            var corrected = _applyOrientation(img, orientation);
            resolve(corrected);
          };
          img.onerror = reject;
          img.src = url;
        };
        reader.readAsArrayBuffer(file);
      });
    }
  
    /**
     * JPEG ArrayBuffer에서 EXIF Orientation 값(1~8)만 빠르게 읽음
     * 전체 EXIF 파서 불필요 — Orientation 태그(0x0112)만 탐색
     * @param {ArrayBuffer} buffer
     * @returns {number} 1~8 (기본값 1)
     */
    function _readExifOrientation(buffer) {
      var view = new DataView(buffer);
      // JPEG SOI 마커 확인
      if (view.getUint16(0) !== 0xFFD8) return 1;
  
      var offset = 2;
      var len = view.byteLength;
  
      while (offset < len - 1) {
        var marker = view.getUint16(offset);
        offset += 2;
  
        // APP1 (EXIF) 마커
        if (marker === 0xFFE1) {
          var segLen = view.getUint16(offset);
          // "Exif\0\0" 확인
          if (view.getUint32(offset + 2) !== 0x45786966) return 1;
  
          var tiffStart = offset + 8;
          var bigEndian = view.getUint16(tiffStart) === 0x4D4D;
  
          var ifdOffset = _getUint32(view, tiffStart + 4, bigEndian);
          var numEntries = _getUint16(view, tiffStart + ifdOffset, bigEndian);
  
          for (var i = 0; i < numEntries; i++) {
            var entryOffset = tiffStart + ifdOffset + 2 + (i * 12);
            if (entryOffset + 12 > len) break;
            if (_getUint16(view, entryOffset, bigEndian) === 0x0112) {
              return _getUint16(view, entryOffset + 8, bigEndian);
            }
          }
          return 1;
        }
  
        // 다른 세그먼트 건너뛰기
        if ((marker & 0xFF00) === 0xFF00) {
          offset += view.getUint16(offset);
        } else {
          break;
        }
      }
      return 1;
    }
  
    function _getUint16(view, o, be) { return view.getUint16(o, !be); }
    function _getUint32(view, o, be) { return view.getUint32(o, !be); }
  
    /**
     * EXIF Orientation에 따라 Canvas에서 회전/반전 적용
     * @param {HTMLImageElement} img
     * @param {number} orientation 1~8
     * @returns {HTMLCanvasElement}
     */
    function _applyOrientation(img, orientation) {
      var w = img.naturalWidth;
      var h = img.naturalHeight;
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
  
      // orientation 5~8은 가로세로 교환
      if (orientation > 4) {
        canvas.width = h;
        canvas.height = w;
      } else {
        canvas.width = w;
        canvas.height = h;
      }
  
      switch (orientation) {
        case 2: ctx.setTransform(-1, 0, 0, 1, w, 0); break;
        case 3: ctx.setTransform(-1, 0, 0, -1, w, h); break;
        case 4: ctx.setTransform(1, 0, 0, -1, 0, h); break;
        case 5: ctx.setTransform(0, 1, 1, 0, 0, 0); break;
        case 6: ctx.setTransform(0, 1, -1, 0, h, 0); break;
        case 7: ctx.setTransform(0, -1, -1, 0, h, w); break;
        case 8: ctx.setTransform(0, -1, 1, 0, 0, w); break;
        default: break; // orientation 1: 변환 없음
      }
  
      ctx.drawImage(img, 0, 0);
      return canvas;
    }
  
  
    // ── 공개 API ──
    ns.compressImage = compressImage;
  
  })();