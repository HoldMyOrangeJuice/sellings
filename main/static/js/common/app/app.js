"use strict"
DOM.main().addComponent(CManager.MainFrame);
PageActions.scroll_to($("body"), 1);
function get_image_path(file_or_files)
{
    if (file_or_files instanceof Array)
    {
        return file_or_files.map(i=>get_image_path(i));
    }
    return `${MEDIA_URL}images/items/${file_or_files}`
}

function get_min_image_path(filename)
{
    return `${MEDIA_URL}images/min/${filename}`
}

registerCustomFilter("media", get_image_path);
registerCustomFilter("min", get_min_image_path);
registerCustomFilter("enumerate", Object.entries);

$(document).on("change", "input[data-role='order-subcat-selector']", (e)=>
{
    if ($(e.target).prop("checked"))
    {
        $("input[data-role='order-subcat-selector']").prop("checked", false );
        $(e.target).prop("checked", true );
        OrderForm.set_subcat( $(e.target).data("subcat_idx") );
    }
    else
    {
        OrderForm.set_subcat(undefined);
    }
});


function edit_favourite(item_id, subcat_idx)
{
    let elem = $(`[data-item_id='${item_id}'][data-subcat_idx=${subcat_idx}][data-role='cart-action']`);
    let subcat = $(`[data-item_id='${item_id}'][data-subcat_id=${subcat_idx}]`);
    let checked = !elem.data('checked')
    if (!checked)
    {
        subcat.removeClass('fav')
    }
    else
    {
        subcat.addClass('fav')
    }
    elem.data('checked', checked);

    let cart_action = checked?'<span>Убрать из корзины</span><i style="margin-left: 4px; color: gray" class="fas fa-trash-alt"></i>':
    '<span>Добавить в корзину</span><i style="margin-left: 2px; color: gray" class="fas fa-shopping-cart"></i>';

    elem.html(cart_action);
    Networker.set_fav_state(item_id, subcat_idx, checked);
}

function handle_image_click(clicked)
{
    let parent = $(clicked).parent();
    // parent contains all image objects
    if (ADMIN)
    {
        handle_adm_image_click(clicked)
    }
    else
    {
        Renderer.open_photo_view_window(clicked, parent);
    }
}
let photos = []
let current = null;


let sc;
$(document).ready(function()
{
    if (ADMIN)
    {
        document.getElementById("file").onchange = (e)=>{ previewImage(document.getElementById("file"), document.getElementById("target"));console.log("show preview") };
    }

    $(window).scroll(function()
    {
        if($(window).scrollTop() + SCREENS_TILL_FETCH * $(window).height() > $(document).height() )
        {
           Searcher.load_more();
        }
   });
});

function query(q)
{
    Searcher.make_query({q: q});
}

function query_cat(c)
{
    Searcher.make_query({cat: c});
}

let currentFocus;
function autocomplete(arr)
{
  let inp = $('#search')[0];
  let val = $(inp).val();
  closeAllLists();
  if (!val) { return false;}
  currentFocus = -1;
  let a = document.createElement("DIV");
  a.setAttribute("id", "searchautocomplete-list");
  a.setAttribute("class", "autocomplete-items");
  inp.parentNode.appendChild(a);

  for (let i = 0; i < arr.length; i++)
  {
      let b = document.createElement("DIV");
      b.innerHTML = arr[i]

      b.addEventListener("click", function(e)
      {
          inp.value = $(e.target).text();
          closeAllLists();
          handle_search_submit();
      });
      a.appendChild(b);
  }
}

function addActive(x) {
  if (!x) return false;
  removeActive(x);
  if (currentFocus >= x.length) currentFocus = 0;
  if (currentFocus < 0) currentFocus = (x.length - 1);
  x[currentFocus].classList.add("autocomplete-active");
}

function removeActive(x) {
  for (let i = 0; i < x.length; i++) {
    x[i].classList.remove("autocomplete-active");
  }
}

function closeAllLists(elmnt) {
  let inp = $('#search')[0];
  let x = document.getElementsByClassName("autocomplete-items");
  for (let i = 0; i < x.length; i++) {
    if (elmnt != x[i] && elmnt != inp) {
    x[i].parentNode.removeChild(x[i]);
  }
}
}

document.addEventListener("click", function (e)
{
    closeAllLists(e.target);
});

/*execute a function presses a key on the keyboard:*/
$('#search').on("keydown", function(e)
{
    let x = document.getElementById("searchautocomplete-list");
    if (x) x = x.getElementsByTagName("div");
    if (e.keyCode == 40) {
      /*If the arrow DOWN key is pressed,
      increase the currentFocus variable:*/
      currentFocus++;
      /*and and make the current item more visible:*/
      addActive(x);
    } else if (e.keyCode == 38) { //up
      /*If the arrow UP key is pressed,
      decrease the currentFocus variable:*/
      currentFocus--;
      /*and and make the current item more visible:*/
      addActive(x);
    } else if (e.keyCode == 13) {
      /*If the ENTER key is pressed, prevent the form from being submitted,*/
      e.preventDefault();
      if (currentFocus > -1) {
        /*and simulate a click on the "active" item:*/
        if (x) x[currentFocus].click();
      }
    }
});

function handle_search_submit()
{
    if (window.location.href.includes("item"))
    {
        window.location.href = "/?q=" + $('#search').val() + "#main";
    }
    else
    {
         Searcher.make_query({q: $('#search').val()});
         $('html, body').animate({ scrollTop: $('#split').offset().top-57 }, 1000);
         document.activeElement.blur();
    }
     return false;
}

$(document).ready( function()
{
    document.getElementById('search_form').onsubmit = function ()
    {
        return handle_search_submit()
    };
})

async function do_autocomplete()
{
    let response = await Networker.get_hints();
    autocomplete(response.payload.items);
}

$('#search').on('input', function(){
    do_autocomplete();
});

let prevscroll = 0;
if (isMobile())
{
    document.onscroll = function(e) {
        let diff = scrolled() - prevscroll;
        prevscroll = scrolled();
        let height = $(".mynavbar")[0].clientHeight+5;
        let top = parseInt($(".mynavbar").css("top"));
        let newTop;
        if (diff > 0)
        {
            // scroll down
            newTop = Math.max(-height, top - diff) + "px"
        }
        else
        {
            //scroll up
            newTop =  Math.min(0, top - diff) + "px";
        }
        $(".mynavbar").css("top", newTop)
    }
}
