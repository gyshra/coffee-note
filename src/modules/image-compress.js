/**
 * src/modules/image-compress.js
 * 이미지 압축 + EXIF Orientation 방어
 * (feature-image-compress.js의 ES Module 버전)
 *
 * 공개 API:
 *   await compressImage(file, { maxSize, quality })
 *   → 반환: data:image/jpeg;base64,...
 */

/**
 * @param {File} file
 * @param {Object} [opts]
 * @param {number} [opts.maxSize=1024]  - 가로/세로 최대 px
 * @param {number} [opts.quality=0.7]   - JPEG 품질 (0~1)
 * @returns {Promise<string>}           - data:image/jpeg;base64,...
 */
export async function compressImage(file, opts) {
  var maxSize = (opts && opts.maxSize) || 1024;
  var quality = (opts && opts.quality) || 0.7;

  var source;

  if (typeof createImageBitmap === 'function') {
    try {
      source = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch (_e) {
      source = await createImageBitmap(file);
    }
  } else {
    source = await _loadImageWithExifFallback(file);
  }

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

  if (source.close) source.close();

  return canvas.toDataURL('image/jpeg', quality);
}

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

function _readExifOrientation(buffer) {
  var view = new DataView(buffer);
  if (view.getUint16(0) !== 0xFFD8) return 1;

  var offset = 2;
  var len = view.byteLength;

  while (offset < len - 1) {
    var marker = view.getUint16(offset);
    offset += 2;

    if (marker === 0xFFE1) {
      var segLen = view.getUint16(offset);
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

function _applyOrientation(img, orientation) {
  var w = img.naturalWidth;
  var h = img.naturalHeight;
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');

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
    default: break;
  }

  ctx.drawImage(img, 0, 0);
  return canvas;
}
