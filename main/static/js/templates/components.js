'use strict';

function select(a, u)
{
    if (ADMIN)
        return a;
    return u;
}

let ImageViewer = new Component(
`<div id='image_viewer'>
    <div class="modal-backdrop fade show"></div>
    <div id='image_viewer_content'>

        <p></p>

        <button class="close image_viewer_close" onclick="Renderer.close_image_view_window()">
          <span aria-hidden="true">&times;</span>
        </button>

        <p></p>

        <button id='viewer_prev' class='btn btn-warning img-viewer-nav'><i class="fas fa-angle-left"></i></button>
        <!-- img main -->
        <div id="image_main" style='background-image: url("{% active >> media %}")'>
        </div>

        <button id='viewer_next' class='btn btn-warning img-viewer-nav'><i class="fas fa-angle-right"></i></button>


        <!-- icons -->
        <div id='image_icons'>
            {$ for image_icon of icons $}
                <div style='background-image: url("{% image_icon >> min %}")'
                     class='bulk_item img-icon {$ if active == image_icon $} active {$ endif $} '></div>
            {$ endfor $}

        <div>
        </div>
    </div>
</div>`
);
CManager.register(ImageViewer, "ImageViewer", UNIVERSAL)

let SelectDropdown = new Component(
    `<select data-role='item-category'
     data-item_id='{% item.id %}'
     class='form-control mr-sm-2 text-form-trackable'>

     {$ for category of Object.values(CATS) $}

         {$ if category == selected $}
             <option selected='selected'> {% category %} </option>
        {$ else $}
             <option> {% category %} </option>
         {$ endif $}
     {$ endfor $}

    </select>`
);
CManager.register(SelectDropdown, "SelectDropdown", UNIVERSAL)

let ThreeDots = new Component(
    `<div style='display: inline-block' class="dropdown three-dots">
      <button class="three-dots-btn"
              type="button"
              id="dropdownMenuButton"
              data-toggle="dropdown"
              aria-haspopup="true"
              aria-expanded="false">
        <i class="fas fa-ellipsis-v px-1" style='font-size: 15px;'></i>
      </button>

      <div class="dropdown-menu" aria-labelledby="dropdownMenuButton">
        <div class="dropdown-item" data-item_id='{% item.id %}'
             data-subcat_idx='{% subcat_idx %}'
             data-role='cart-action'
             data-checked='{% subcat.fav %}'
             onclick='edit_favourite({% item.id %}, {% subcat_idx %})'>

             {$ if subcat.fav $}
                <span>Убрать из корзины</span><i style="margin-left: 4px; color: gray" class="fas fa-trash-alt"></i>
             {$ else $}
                <span>Добавить в корзину</span><i style="margin-left: 2px; color: gray" class="fas fa-shopping-cart"></i>
             {$ endif $}

        </div>

        <div class="dropdown-item" onclick='OrderForm.open({% item.id %}, {% subcat_idx %})'>
            <span>Заказать</span><i style='margin-left: 5px; color: gray' class="fas fa-money-check"></i>
        </div>
      </div>
    </div>`
);
CManager.register(ThreeDots, "ThreeDots", UNIVERSAL)

let AdminSubcat = new Component(
    `<tr data-subcat_id='{% subcat_idx %}'
        data-item_id='{% item.id %}'
        data-role='subcat_entry'>

        <td title="Код">
        <input data-subcat_id='{% subcat_idx %}'
               data-item_id='{% item.id %}'
               data-role='subcat_code'
               class='text-form-trackable edit-form input-int'
               value='{% subcat.code || DEF_BLANK_VAL_TEXT %}'>
        </td>

        <td title="Параметр">
            <input data-subcat_id='{% subcat_idx %}'
                   data-item_id='{% item.id %}'
                   data-role='subcat_param'
                   class='text-form-trackable edit-form input-text'
                   value='{% subcat.param || DEF_BLANK_VAL_TEXT %}'>
        </td>

        <td title="Цена">
            <span class='nowrap'>
                <input data-subcat_id='{% subcat_idx %}'
                       data-item_id='{% item.id %}'
                       data-role='subcat_price'
                       class='text-form-trackable edit-form input-int'

                       value='{% subcat.price || DEF_BLANK_VAL_NUM %}'>
            </span>
        </td>

        <td title="Количество">
            <span class='nowrap'>
                <input data-subcat_id='{% subcat_idx %}'
                       data-item_id='{% item.id %}'
                       data-role='subcat_amount'
                       class='text-form-trackable edit-form input-int'
                       value={% subcat.amount || 0 %}>
            </span>
        </td>

        <td title="Удалить">
            <button class='btn btn-danger'
                    onclick='delete_subcat({% item.id %}, {% subcat_idx %})'>
                    {% LANG.delete %}
            </button>
        </td>
    </tr>
    `
);
let UserSubcat = new Component(
    `
    <tr class='{$ if subcat.fav $} fav {$ endif $}'
         data-subcat_id='{% subcat_idx %}'
         data-item_id='{% item.id %}'
         data-role='subcat_entry'>

        <td title="Код">
            {% subcat.code || DEF_BLANK_VAL_TEXT %}
        </td>

        <td title="Параметр">
            {% subcat.param || DEF_BLANK_VAL_TEXT %}
        </td>

        <td title="Цена">
            <span class='nowrap'>
                {% subcat.price || "?" %} грн.
            </span>
        </td>

        <!--
        <td>
            <span class='nowrap'>
                {% subcat.amount || "?" %} шт.
            </span>
        </td>
        -->

        <td title="Действия"
            style='position: relative; padding-left: 0; padding-right: 0;'>
            {$ let subcat_idx = subcat.subcat_id $}
            {% include ThreeDots %}
        </td>
    </tr>`
);
let Subcategory = select(AdminSubcat, UserSubcat);
CManager.register(Subcategory, "Subcategory", UNIVERSAL)

let SubcatTable = new Component(
    `<div class=''>
        <table border="0"
               data-subcat_table='{% item.id %}'
               style='width: 100%'>
            <tbody>
                {$ for subcat_idx, subcat of item.subcats >> enumerate $}
                    {% include Subcategory %}
                {$ endfor $}
            </tbody>
        </table>
    </div>`
);
CManager.register(SubcatTable, "SubcatTable", UNIVERSAL)

let AdminImage = new Component(
    `
    {$ let uniqueid = uuid() $}

    {$ if temp $}
        {$ let reader  = new FileReader() $}

        <script>
            reader.onloadend = () =>
            $("img[data-item_id='{% item.id %}'][data-uuid-promise='{% uniqueid %}']").attr("src", reader.result).removeAttr('data-uuid-promise')
        </script>

        {% reader.readAsDataURL(file) %}
    {$ endif $}

    <img src='{$ if temp $} placeholder {$ else $} {% file >> media %} {$ endif $}'
          class='adm-img {$ if temp $} temp_image {$ endif $}'
          data-item_id='{% item.id %}'
          data-role='illustration'

          {$ if !temp $}
            id='{% file %}'
          {$ endif $}

          {$ if temp $}
              data-uuid-promise='{% uniqueid %}'
              onclick=handle_image_click(this)
          {$ endif $}>
    `
);
CManager.register(AdminImage, "AdminImage", UNIVERSAL)

let AdminImageBulk = new Component(
    `<div data-item_id='{% item.id %}'
          data-role='image_bulk'
          class='image_bulk'>

         {$ for file of item.photo_paths $}
            {$ let temp = false $}
            {% include AdminImage %}
         {$ endfor $}

    </div>

    <button class='btn btn-danger mt-1'
            data-item_id='{% item.id %}'
            data-role='delete_images'
            style='display:none'
            onclick='delete_selected_photos({% item.id %})'>
    </button>
      `
);
let UserImageBulk = new Component(
    `<div data-item_id='{% item.id %}'
          data-role='image_bulk'
          class='image_bulk'>

        {$ for path of item.photo_paths $}

            {$ let side = (Math.min(200,(jQuery("#table-container").width()-item.photo_paths.length*40)/item.photo_paths.length))||200 $}


            <img loading="lazy" class='bulk_item'
                 style='width: {% side %}px; height: {% side %}px;'
                 src="{% path >> min %}");
                 data-role='image_icon'
                 data-path='{% path %}'
                 onclick='handle_image_click(this)'>
        {$ endfor $}

    </div>`
);
let ImageBulk = select(AdminImageBulk, UserImageBulk)
CManager.register(ImageBulk, "ImageBulk", UNIVERSAL)

let MonoFrame = new Component(
    `<table class='table table-bordered table-stripped'>

        <thead class='thead thead-dark'>
            <tr>
                {$ if ADMIN $}
                    <th>Название</th>
                    <th>Описание</th>
                    <th>Фото</th>
                    <th>Характеристики</th>
                    <th>Состояние</th>
                    <th>Удалить</th>
                {$ else $}
                    <th>Название</th>
                    <th>Описание</th>
                    <th>Состояние</th>
                    <th>Характеристики</th>
                {$ endif $}
            </tr>
        </thead>

        <tbody id='mono-table'>
        </tbody>
    </table>`
);
CManager.register(MonoFrame, "MonoFrame", UNIVERSAL)

let FavouriteItem = new Component(
    `<table class='table table-bordered'>
        <thead class='thead thead-dark'>
            <tr>
                <th colspan='3'>
                    {% item.name %}
                </th>
            </tr>
        </thead>

        <tbody>
            <tr>
                <td colspan='2'>
                    <table>
                        {$ let subcat_idx = item.subcat_id $}
                        {$ let subcat = item $}
                        {% include Subcategory %}
                    </table>
                </td>
                <td> {% item.description || DEF_BLANK_VAL_TEXT %}</td>
            </tr>

            <tr>
                <td colspan='3'>
                    <button class='btn btn-warning btn-lg'
                            onclick="OrderForm.open({% item.id %}, {% item.subcat_id %})">Заказать</button>

                    <a class='btn btn-warning btn-lg nowrap'
                       onclick='PageActions.open_in_new_window("/item/{% item.id %}")'> Открыть в новом окне
                    </a>
                </td>
            </tr>
        </tbody>
    </table>`
);
CManager.register(FavouriteItem, "FavouriteItem", UNIVERSAL)

let Spinner = new Component(`
    <div class="spinnerComponent" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%);">
    <div class="spinner-border text-primary" role="status">
    <span class="sr-only">Loading...</span>
    </div>
    </div>
    `);
CManager.register(Spinner, "Spinner", UNIVERSAL)

let FavouriteTableDesktop = new Component(
    ` <div class='scrollable'>
        <div id='fav-items-cont'>

            {$ if fav_items.length == 0$}
                <p style='text-align: center; color: white;'>
                    Ваша корзина пустая.
                </p>
            {$ endif $}

            {$ for item of fav_items $}

                {% include FavouriteItem %}
            {$ endfor $}

        </div>

        <div class='flex'>
          <div onclick='Renderer.close_fav_table()'
              id='collapse_fav_tab'>
              <i class="fas fa-angle-up"></i>
          </div>
       </div>
   </div>
    `
);
CManager.register(FavouriteTableDesktop, "FavouriteTable", DESKTOP_ONLY)

let MainFrameDesktop = new Component(
    `<div class="flex"><p id='empty-query-banner'></p></div>
    <div id="table-container" class='body-main-content'>

        <!-- placeholder table with spinner -->
        <div class="flex body-main-content"><h3 class="mb-4">Загрузка...</h3></div>

        <table class='placeholder table table-bordered table-stripped'>
            <thead class="thead thead-dark">
            <tr>
            <th>Наименование</th>
            <th>Подкатегории</th>
            <th>Состояние</th>
            <th>описание</th>
            </tr>
            </thead>
        <tbody>
        <tr>
        <td colspan='4'>
        <div style='display:flex;justify-content:center;align-items:center;height:30vh;'>
            <div class="spinner-border text-warning" role="status">
                <span class="sr-only">Loading...</span>
            </div>
        </div>
        </td>
        </tr>
        <tr>
        <td colspan='4'>
        <div style='width:100%;display:flex;justify-content:space-evenly'>
        <div class='animated-background' style="width:200px;height:200px"></div>
        <div class='animated-background' style="width:200px;height:200px"></div>
        <div class='animated-background' style="width:200px;height:200px"></div>
        </div>
        </td>
        </tr>
        </tbody>

        </table>
    <!-- to be filled with JS -->
    </div>`
);
CManager.register(MainFrameDesktop, "MainFrame", DESKTOP_ONLY)

let AdminFrameEntryDesktop = new Component(
    `<tr data-item_id='{% item.id %}'
         data-role='main_item_data'>

        <td>
            <textarea rows='1'
                      data-role='item-name'
                      data-item_id='{% item.id %}'
                      style='overflow:hidden'
                      class='edit-form input-text text-form-trackable'>
                      {% item.name %}
            </textarea>
        </td>

        <td colspan=0>
            {% include SubcatTable %}

            <button class='btn btn-success btn-lg btn-block'
                    style='margin-top: 10px'
                    onclick='add_empty_subcat({% item.id %})'>
                        {% LANG.add %}
            </button>
        </td>

        <td>
            {$ let selected = item.category $}
            {% include SelectDropdown %}
        </td>

        <td>
            <textarea rows='1'
                      data-role='item-description'
                      data-item_id='{% item.id %}'
                      style='overflow:hidden'
                      class='auto-adjust edit-form input-text text-form-trackable'>
                      {% item.description || DEF_BLANK_VAL_TEXT %}
            </textarea>
        </td>

        <td>
            <textarea rows='1'
                      data-role='item-condition'
                      data-item_id='{% item.id %}'
                      style='overflow:hidden'
                      class='auto-adjust edit-form input-text text-form-trackable'>
                      {% item.condition || DEF_BLANK_VAL_TEXT %}
            </textarea>
        </td>

       <td data-item_id={% item.id %}
           data-role="item-manipulation">

            <button class='btn btn-danger'
                    onclick=AdminNetworker.delete_item('{% item.id %}')>
                    {% LANG.delete %}
            </button>

            <hr>
        </td>
    </tr>

    <tr data-item_id='{% item.id %}' data-role='photo_item_data'>
        <td colspan='7'>
        {% include ImageBulk %}
        <hr>
        <label for='{% "edit-file-"+item.id %}' class='btn btn-success'>
            {% LANG.add %}
        </label>

            <form data-item_id='{% item.id %}' data-role='add_files_form'>
                <input type='file'
                       data-item_id='{% item.id %}'
                       data-role='add_files_input'
                       multiple='multiple'
                       class='hidden'
                       name='photo'
                       id='{% "edit-file-"+item.id %}'>
            </form>
        </td>
    </tr>`
);
let UserFrameEntryDesktop = new Component(
    `<tr>
        <td title="Открыть на странице" style="font-weight: 600; width: 25%">
            <a class='link' href='/item/{% item.id %}'>
                {% item.name %}
            </a>
            <br>
            <a class='link small-text' onclick='PageActions.open_in_new_window("/item/{% item.id %}")'>
                В новой вкладке
            </a>
            <br>
            <button class='mt-4 btn btn-dark'
                    onclick='OrderForm.open({% item.id %})'>Заказать</button>
        </td>

        <td title="Подкатегории" style="width: 40%">
            {% include SubcatTable %}
        </td>

        <td title="Состояние" class='p-3' style="width: 10%">
            Состояние {% item.condition || DEF_BLANK_VAL_TEXT %}
        </td>

        <td class='p-4'> {% item.description || DEF_BLANK_VAL_TEXT %} </td>
    </tr>

    <tr style="width: 25%; border-bottom:4px solid var(--cdark)">
        <td title="Изображения" colspan='4'>
            {% include ImageBulk %}
        </td>
    </tr>`
);
let FrameEntryDesktop = select(AdminFrameEntryDesktop, UserFrameEntryDesktop)
CManager.register(FrameEntryDesktop, "FrameEntry", DESKTOP_ONLY)

let CategoryFrameDesktop = new Component(
    `
    <div class='flex body-main-content'><h3 class='mb-4'>{% category %}</h3></div>
    <div class='body-main-content' >
    <table class='table table-bordered table-stripped'>

        <thead class='thead thead-dark'>
            <tr>
             {$ if ADMIN $}
                 <th>{% LANG.name %}</th>
                 <th>{% LANG.cats %}</th>
                 <th>{% LANG.category %}</th>
                 <th>{% LANG.desc %}</th>
                 <th>{% LANG.cond %}</th>
                 <th>{% LANG.delete %}</th>
             {$ else $}
                 <th>{% LANG.name %}</th>
                 <th>{% LANG.cats %}</th>
                 <th>{% LANG.cond %}</th>
                 <th>{% LANG.desc %}</th>
             {$ endif $}
            </tr>
        </thead>

        <tbody data-category='{% category %}' data-role="category-frame">
        </tbody>
        </table>
        </div>`
);
CManager.register(CategoryFrameDesktop, "CategoryFrame", DESKTOP_ONLY)

let CategoryFrameMobile = new Component(
    `<div data-category='{% category %}' data-role="category-frame" class='flex'>
        <div class='flex'><h3 class='mb-4'>{% category %}</h3><div>
    </div>`
);
CManager.register(CategoryFrameMobile, "CategoryFrame", MOBILE_ONLY)

let AdminFrameEntryMobile = new Component(
    `<tr data-item_id='{% item.id %}'
         data-role='main_item_data'>

        <td>
            <textarea rows='1'
                      data-role='item-name'
                      data-item_id='{% item.id %}'
                      style='overflow:hidden'
                      class='edit-form input-text text-form-trackable'>
                      {% item.name %}
            </textarea>
        </td>

        <td colspan=0>
            {% include SubcatTable %}

            <button class='btn btn-success btn-lg btn-block'
                    style='margin-top: 10px'
                    onclick='add_empty_subcat({% item.id %})'>
                        {% LANG.add %}
            </button>
        </td>

        <td>
            {$ let selected = item.category $}
            {% include SelectDropdown %}
        </td>

        <td>
            <textarea rows='1'
                      data-role='item-description'
                      data-item_id='{% item.id %}'
                      style='overflow:hidden'
                      class='auto-adjust edit-form input-text text-form-trackable'>
                      {% item.description || DEF_BLANK_VAL_TEXT %}
            </textarea>
        </td>

        <td>
            <textarea rows='1'
                      data-role='item-condition'
                      data-item_id='{% item.id %}'
                      style='overflow:hidden'
                      class='auto-adjust edit-form input-text text-form-trackable'>
                      {% item.condition || DEF_BLANK_VAL_TEXT %}
            </textarea>
        </td>

       <td data-item_id={% item.id %}
           data-role="item-manipulation">

            <button class='btn btn-danger'
                    onclick=AdminNetworker.delete_item('{% item.id %}')>
                    {% LANG.delete %}
            </button>

            <hr>
        </td>
    </tr>

    <tr data-item_id='{% item.id %}' data-role='photo_item_data'>
        <td colspan='7'>
        {% include ImageBulk %}
        <hr>
        <label for='{% "edit-file-"+item.id %}' class='btn btn-success'>
            {% LANG.add %}
        </label>

            <form data-item_id='{% item.id %}' data-role='add_files_form'>
                <input type='file'
                       data-item_id='{% item.id %}'
                       data-role='add_files_input'
                       multiple='multiple'
                       class='hidden'
                       name='photo'
                       id='{% "edit-file-"+item.id %}'>
            </form>
        </td>
    </tr>`, "AdminFrameEntry"
);
let UserFrameEntryMobile = new Component(
    `<table class='table table-bordered'>

        <thead class='thead-dark'>
            <tr>
                <th>
                    <p style='display: inline-block; margin: 0;'>
                        <a style='font-size: 20px; color: white;' class=''>{% item.name %}</a>
                    </p>
                    <p class='subtitle m-0' onclick='PageActions.open_in_new_window("/item/{% item.id %}")'>
                        Открыть в новом окне
                    </p>
                </th>
            </tr>
        </thead>

        <tbody>
        {$ if item.description $}
            <tr>
                <td style='color: gray; padding: 1vh 4vw 1vh 4vw; font-weight: 100; font-size: small;'>
                    {% item.description || DEF_BLANK_VAL_TEXT %}
                </td>
            </tr>
        {$ endif $}

            {$ if item.photo_paths.length $}
                <tr>
                    <td class='flex'>
                        {% include ImageBulk %}
                    </td>
                </tr>
            {$ endif $}

            <tr>
                <td>
                    {% include SubcatTable %}
                </td>
            </tr>

            {$ if item.condition $}
                <tr>
                    <td>
                        Состояние:<br>
                        {% item.condition %}
                    </td>
                </tr>
            {$ endif $}
        </tbody>

    </table>`, "UserFrameEntry"
);
let FrameEntryMobile = select(AdminFrameEntryMobile, UserFrameEntryMobile)
CManager.register(FrameEntryMobile, "FrameEntry", MOBILE_ONLY)

let MainFrameMobile = new Component(
    `<div class="flex"><p id='empty-query-banner'></p></div>
    <div id="table-container" class='body-main-content'>
    <!-- to be filled with JS -->
    </div>`, "MainFrame"
);
CManager.register(MainFrameMobile, "MainFrame", MOBILE_ONLY)

let FavouriteTableMobile = new Component(
    `<div class='scrollable'>
        <div id='fav-items-cont'></div>

        {$ if fav_items.length == 0 $}
            <p style='text-align: center; color: white;'>
                Ваша корзина пустая.
            </p>

        {$ else $}
            <div id='fav-items-cont'>

            {$ for item of fav_items $}
                <table class='table table-bordered'>
                    <thead class='thead thead-dark'>
                        <tr>
                            <th colspan='2'>
                                {% item.name %}
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        <tr>
                            <td colspan='2'>
                                <table style="width: 100%">
                                    {$ let subcat = item $}
                                    {% include Subcategory %}
                                </table>
                            </td>
                        </tr>

                        <tr>
                            <td>
                                <button class='btn btn-warning btn-block'
                                        onclick="OrderForm.open({% item.id %}, {% item.subcat_id %})">Заказать</button>
                            </td>
                            <td>
                                <a class='btn btn-warning btn-block nowrap'
                                   onclick='PageActions.open_in_new_window("/item/{% item.id %}")'>Открыть в новом окне</a>
                            </td>
                        </tr>
                    </tbody>
                </table>
            {$ endfor $}

            </div>
        {$ endif $}

        <div class='flex'>
            <div onclick='Renderer.close_fav_table()'
               id='collapse_fav_tab'>
               <i class="fas fa-angle-up"></i>
            </div>
        </div>

      </div>`, "FavouriteTable"
);
CManager.register(FavouriteTableMobile, "FavouriteTable", MOBILE_ONLY)
