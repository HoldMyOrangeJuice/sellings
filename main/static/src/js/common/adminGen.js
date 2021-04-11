'use strict';

function genSaveItemBtn(item_id) {
  return "<button class='btn btn-warning'\n            data-item_id='".concat(item_id, "'\n            data-role='confirm_main_data_edit'\n            onclick=AdminNetworker.update_item('").concat(item_id, "')>\n            ").concat(LANG.save, "\n    </button>");
}

function genImagesSaveBtn(item_id, fileCount) {
  return "<button class='btn btn-warning'\n              data-role='confirm_photo_addition'\n              data-item_id='".concat(item_id, "'\n              style='margin-top: 10px'\n              onclick='AdminNetworker.save_images(").concat(item_id, ")'>\n              ").concat(LANG.save, " ").concat(fileCount, " \u0444\u043E\u0442\u043E\n      </button>");
}