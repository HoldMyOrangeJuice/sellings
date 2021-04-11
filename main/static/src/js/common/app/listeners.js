import OrderForm from "./order"
import Searcher from "./searcher"
import Networker from "./network/networker"
import Renderer from "./renderer"
import PageActions from "./page_utils"
import { isMobile, scrolled } from "../utils"

function initListeners()
{
    $(document).ready(()=>
    {
        Renderer.renderMainFrame()

        if (render_mode == 'price_list') {
               Searcher.make_query({
                    silent: true,
                    q: page_href_query,
                    cat: page_href_cat_id})
        }
        else
        {
            Searcher.make_query({id: item_id, silent: true });
            Searcher.disabled = true;
        }

        if (ADMIN)
        {
            document.getElementById("file").onchange = (e)=>{ previewImage(document.getElementById("file"), document.getElementById("target"))};
        }

        $(window).scroll( ()=> {
            if($(window).scrollTop() + SCREENS_TILL_FETCH * $(window).height() > $(document).height() )
            {
               Searcher.load_more();
            }
       });

    })

    // open order
    $(document).on("click", "[data-role='open-order-form']",
    (e)=>{
        let item_id = $(e.currentTarget).data("item_id")
        let sucat_id = $(e.currentTarget).data("data-subcat_id")
        OrderForm.open(item_id, sucat_id);
    })

    $(document).on("click", "button[data-role='submit-order-form']",
    (e)=>{
        OrderForm.submit();
    })

    $(document).on('click', "[data-role='send-mail']", (e)=>
    {
        let address = $(e.currentTarget).data('address') || "vfo@ukr.net";
        let subject = $(e.currentTarget).data('subject') || "";
        let body = $(e.currentTarget).data('body') || "";
        window.open(`mailto:${address}?subject=${subject}&body=${body}`);
    })

    $(document).on('click', "[data-role='make-call']", (e)=>
    {
        let number = $(e.currentTarget).data('phone-number');
        if (number)
            window.open(`tel:${number}`);
    })

    $(document).on("change", "input[data-role='order-subcat-selector']", (e)=>
    {
        if ($(e.currentTarget).prop("checked"))
        {
            $("input[data-role='order-subcat-selector']").prop("checked", false );
            $(e.currentTarget).prop("checked", true );
            OrderForm.set_subcat( $(e.currentTarget).data("subcat_idx") );
        }
        else
        {
            OrderForm.set_subcat(undefined);
        }
    });


    function handle_search_submit()
    {
        let search_query = $('#search').val()
        if (window.location.href.includes("item"))
        {
            window.location.href = `/?q=${search_query}#main`;
        }
        else
        {
             Searcher.make_query({q: search_query});
             document.activeElement.blur();
        }
        return false;
    }

    $(document).on('keyup', (e)=>
    {
        if (e.key === 'Enter' || e.keyCode === 13)
            handle_search_submit();
    });

    $(document).on("click", '[data-role="submit-search-query"]', handle_search_submit);


    $(document).on("click", '[data-role="query-cat"]', (e)=>
    {
        let cat_id = $(e.currentTarget).data("cat_id")
        Searcher.make_query({cat: cat_id});
    })

    $(document).on('click', '[data-role="full-list"]', (e)=>
    {
        Searcher.make_query({q: ""});
    })

    $(document).on('click', '[data-role="toggle-fav-tab"]', (e)=>
    {
        Renderer.toggle_fav_tab();
    })

    $(document).on('click', '[data-role="toggle-contacts"]', (e)=>
    {
        Renderer.toggle_contacts();
    })

    $(document).on('click', '[data-role="open-new-tab"]', (e)=>
    {
        PageActions.open_in_new_window($(e.currentTarget).data('link'));
    })

    $(document).on('click', '#image_viewer', (e)=>
    {
        if ($(e.target).attr('id') === "image_viewer_content") {
            Renderer.show_navbar();
            Renderer.close_image_view_window();
        }
    });

    $(document).on('click', '[data-role="toggle-fav"]', (e)=>
    {
        let jq = $(e.currentTarget);
        let args = [jq.data("item_id"), jq.data("subcat_idx"), !jq.data("fav")];
        Renderer.edit_favourite(...args);
        Networker.set_fav_state(...args);
    })

    $(document).on('click', '[data-role="close-fav-tab"]', (e)=>
    {
        Renderer.close_fav_table();
    })

    function open_image(e)
    {
        let jq = $(e.currentTarget);
        Renderer.hide_navbar();
        Renderer.open_photo_view_window(jq.data('item_id'), jq.data('photo-index'));
    }

    $(document).on('click', '[data-role="image-icon"]', open_image)
    //$(document).on('click', '[data-role="image-preview"]', open_image)

   $(document).on('click', "[data-role='close-image-viewer']",
    (e)=>
    {
        Renderer.close_image_view_window();
        Renderer.show_navbar();
    });

   $('body').on('keydown', e=>{
       if (e.key == 'Escape')
       {
           Renderer.close_image_view_window();
           Renderer.show_navbar();
       }
       if(e.key == "ArrowLeft")Renderer.prev();
       if (e.key == "ArrowRight")Renderer.next();
   })

    let prevscroll = 0;

    if (isMobile())
    $(document).on("scroll", (e) => {
        let diff = scrolled() - prevscroll;
        prevscroll = scrolled();
        let height = $(".mynavbar")[0].clientHeight+5;
        let top = parseInt($(".mynavbar").parent().css("top"));
        if (isNaN(top)){top = 0}
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
        $(".mynavbar").parent().css("top", newTop)
    })


    $('#search').on("keydown", (e) =>
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
           closeAllLists();
           e.preventDefault();
           if (currentFocus > -1) {
             /*and simulate a click on the "active" item:*/
             if (x) x[currentFocus].click();
           }
         }
     });

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

     document.addEventListener("click", (e) =>
     {
         if (e.target != $('#search').get(0))
             closeAllLists(e);
     });

     $('#search').on('input', async () => {
         let response = await Networker.get_hints();
         autocomplete(response.payload.items);
     });
}
export default initListeners
