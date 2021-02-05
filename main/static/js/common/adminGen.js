function genSaveItemBtn(item_id)
{
    console.log("save item btn");
    return `<button class='btn btn-warning'
            data-item_id='${item_id}'
            data-role='confirm_main_data_edit'
            onclick=AdminNetworker.update_item('${item_id}')>
            ${LANG.save}
    </button>`
}

function genImagesSaveBtn(item_id, fileCount)
{
    return `<button class='btn btn-warning'
              data-role='confirm_photo_addition'
              data-item_id='${item_id}'
              style='margin-top: 10px'
              onclick='AdminNetworker.save_images(${item_id})'>
              ${LANG.save} ${fileCount} фото
      </button>`
}
