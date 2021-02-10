class AdminNetworker extends NetworkerBase
{
    static add_item()
    {
        let form_data = new FormData($("#add_item_form")[0])
        this.POST(form_data).then(function cb(data)
        {
            if (data.success)
                reset_form($("#add_item_form"));
            else
                alert("Не все поля заполнены.")
        });
    }

    static async delete_item(id)
    {
        let response = await this.POST( {"id_to_del": id} )
        if (response.success)
            Renderer.delete_item(id);
    }

    static async update_item(item_id)
    {
        // everything except photo done here
        let formData = new FormData();
        formData.append("id_to_edit", item_id);

        let item = this.serialize_item(item_id);
        for (let key of Object.keys(item))
        {
            formData.append(key, item[key]);
        }

        let response = await this.POST(formData);
        if (response.success)
        {
            // remove unsaved background
            let unsaved_item = $(`tr[data-item_id='${item_id}'][data-role='main_item_data']`).find('.unsaved')
            SaveManager.set_unsaved_state(item_id, false, 0);

            // remove save button
            $(`button[data-item_id=${item_id}][data-role='confirm_main_data_edit']`).remove();
        }
    }

    static async delete_photos(item_id, filenames)
    {
        let r = await this.POST({item_id: item_id, filenames_to_delete: JSON.stringify(filenames)})
        return r;
    }

    static serialize_item(item_id)
    {
        let item_data = this.serialize_common_item_data(item_id);
        item_data.subcats = JSON.stringify(this.serialize_subcats(item_id));

        return item_data;
    }

    static serialize_common_item_data(item_id)
    {
        const FIELDS = ["name", "condition", "description", "category"]
        let res = {}
        for (let field of FIELDS)
            res[field] = $(`[data-item_id='${item_id}'][data-role='item-${field}'`).val();

        return res;
    }

    static serialize_subcats(item_id)
    {
        const FIELDS = ['param', 'price', 'amount', 'code']
        let data = []
        let subcats_count = $(`[data-item_id='${item_id}'][data-role='subcat_entry']`).length
        for (let i=0; i < subcats_count; i++)
        {
            let entry = {}
            for (let field of FIELDS)
            {
                entry[field] = $($(`[data-item_id='${item_id}'][data-role='subcat_${field}']`)[i]).val()
            }
            data.push(entry);
        }
        return data;
    }

    static async save_images(item_id)
    {
        let preview_elems = $(`img.temp_image[data-item_id=${item_id}]`);
        let files = $(`input[data-item_id='${item_id}'][data-role='add_files_input']`)[0].files
        console.log("files:", files);
        if (files.length == 0)
        {
            console.log('no files saved');
            return;
        }

        let formData = new FormData( $(`form[data-item_id='${item_id}'][data-role='add_files_form']`)[0] );

        formData.append("item_id_add_photo_for", item_id);
        let response = await Networker.POST(formData);

        // remove temp photos and
        // add new with static link
        preview_elems.remove()
        //remove item from not not saved
        SaveManager.set_unsaved_state(item_id, false, 1);
        for (let filename of response.payload.filenames)
        {
            append_photo(item_id, filename, false);
        }

        // remove upload button
        $(`button[data-item_id='${item_id}'][data-role='confirm_photo_addition']`).remove();
        // remove cancel button
        $(`button[data-item_id='${item_id}'][data-role='cancel_photo_addition']`).remove();
        // remove files from imput
        reset($(`input[data-item_id=${item_id}][data-role='add_files_input']`))
    }
}

class SaveManager
{
    static unsaved_item_photos = []
    static unsaved_item_data = []

    static unsaved_check()
    {
        if ( $(".unsaved").length == 0)
        {
            $("#not_saved_alert").hide();
        }
    }

    static set_unsaved_state(item_id, not_saved, role)
    {
        // role 0 - item data
        // role 1 - item photos

        let elem = $(`[data-item_id='${item_id}'][data-role='${role?'photo_item_data':'main_item_data'}']`);
        console.log("elem cont", elem);
        if (not_saved)
        {
            if (role == 0)
                showItemSaveButton(item_id);
            else
                showImagesSaveCancelButton(item_id);

            $("#not_saved_alert").show();
            $(elem).addClass('unsaved');
            if (role == 0 && !this.unsaved_item_data.includes(item_id))
                this.unsaved_item_data.push(item_id)
            else if (!this.unsaved_item_photos.includes(item_id))
                this.unsaved_item_photos.push(item_id)
            return;
        }

        $(elem).removeClass('unsaved');
        if (role == 0)
            this.unsaved_item_data.remove(item_id)
        else
            this.unsaved_item_photos.remove(item_id)
        this.unsaved_check();
    }

    static save_all_unsaved()
    {
        for ( let item_id of this.unsaved_item_photos)
            AdminNetworker.save_images(item_id);
        for ( let item_id of this.unsaved_item_data)
            AdminNetworker.update_item(item_id);
    }
}

//request_photo_delete
async function delete_selected_photos(item_id)
{
    let selected_photos = $(`img.selected[data-item_id='${item_id}']`)
    let filenames = []
    for (let elem of selected_photos)
        filenames.push(elem.id);

    let res = await AdminNetworker.delete_photos(item_id, filenames);
    selected_photos.remove();

    $(`button[data-item_id='${item_id}'][data-role='delete_images']`).hide();
}

function cancel_addition_of_photos(item_id)
{
    // remove temp images
    $(`img.temp_image[data-item_id='${item_id}']`).remove();
    // remove 'unsaved' class from image container
    SaveManager.set_unsaved_state(item_id, false, 1);

    // remove control buttons
    $(`button[data-item_id=${item_id}][data-role='cancel_photo_addition']`).remove();
    $(`button[data-item_id=${item_id}][data-role='confirm_photo_addition']`).remove();

    // reset file form
    reset($(`input[data-item_id=${item_id}][data-role='add_files_input']`))
}

function update_photo_delete_function(item_id)
{
    let del_btn = $(`button[data-item_id=${item_id}][data-role='delete_images']`)
    let selected_photos = $(`img.selected[data-item_id='${item_id}']`)
    if (selected_photos.length == 0)
    {
        del_btn.hide()
    }
    else
    {
        del_btn.text(`Удалить ${selected_photos.length} фото`)
        del_btn.show()
    }
}

function track_text_changes()
{
    $(document).on("input", '.text-form-trackable',
        (e)=>
        {
            let item_id = $(e.target).data('item_id');
            SaveManager.set_unsaved_state(item_id, true, 0);
        }
    )
}

function showItemSaveButton(item_id)
{
    let container = $(`td[data-item_id='${item_id}'][data-role='item-manipulation']`);

    if (container.find("[data-role='confirm_main_data_edit']").length == 0)
        container.append(genSaveItemBtn(item_id))
}



function genImagesCancelBtn(item_id)
{
    return `<button data-item_id=${item_id}
              class='btn btn-danger'
              style='margin: 10px 5px 0 0'
              data-role='cancel_photo_addition'
              onclick='cancel_addition_of_photos(${item_id})'>
              ${LANG.cancel}
      </button>`;
}

function showImagesSaveCancelButton(item_id, photoCount)
{
    let container = $(`div[data-item_id='${item_id}'][data-role='image_bulk']`).parent();

    let elem = $(`input[data-item_id='${item_id}'][data-role='add_files_input']`);

    if (container.find("[data-role='confirm_photo_addition']").length == 0)
    {
        container.append(genImagesSaveBtn(item_id, elem[0].files.length));
        container.append(genImagesCancelBtn(item_id));
    }
}

// append fhoto to existing bulk
function append_photo(item_id, filename, temp)
{
    if (temp)
    {
        SaveManager.set_unsaved_state(item_id, true, 1);

        // add cancel button
    }

    $(`div[data-item_id='${item_id}'][data-role='image_bulk']`).append
    (HtmlGen.gen_adm_photo_image_html(item_id, filename, temp))
}

function reset_form(jq)
{
    jq.find("input").val("");
    jq.find("textarea").val("");
    jq.find(".preview").empty();
}

function previewImage(source, target)
{
    photos = []
    for (let file of source.files)
    {
        let reader = new FileReader();
        reader.onloadend = function ()
        {
            photos.push(reader.result);
            if (photos.length == source.files.length)
            {
                html = ""
                for (let base64 of photos)
                {
                    html+= `<img src=${base64} class='previewInstance'>`
                }

                $(target).html(
                    `${html}`
                )
            }
        }
        if (file)
        {
            reader.readAsDataURL(file);
        }
    }
}

function add_empty_subcat(item_id)
{
    SaveManager.set_unsaved_state(item_id, true, 0);
    console.log("set unsaved state");
    let subcat_idx = PageActions.count_subcats(item_id);
    let html = HtmlGen.gen_adm_subcat(item_id, subcat_idx, "", "", 0, 0, false)
    $(`table[data-subcat_table=${item_id}]`).find('tbody').append(html)
}

function delete_subcat(item_id, subcat_id)
{
    SaveManager.set_unsaved_state(item_id, true, 0);
    $(`tr[data-subcat_id='${subcat_id}'][data-item_id='${item_id}'][data-role='subcat_entry']`).remove();
}


function listen_to_tmp_img_load()
{
    $(document).on("change", "input[data-role='add_files_input']",

    (e) =>
        {
            let i = e.target;
            let item_id = $(i).data('item_id');
            for (let file of i.files)
            {
                append_photo(item_id, file, true)
            }
            SaveManager.set_unsaved_state(item_id, true, 1);
        });
}



function handle_adm_image_click(clicked)
{
    console.log(clicked);
    if ($(clicked).hasClass("selected"))
    {
        $(clicked).removeClass("selected");
    }
    else
    {
        $(clicked).addClass("selected");
    }
    update_photo_delete_function( $(clicked).data('item_id') );
}
track_text_changes();
listen_to_tmp_img_load();
