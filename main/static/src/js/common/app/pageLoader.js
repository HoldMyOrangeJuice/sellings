import Searcher from "./searcher"
import Renderer from "./renderer"

async function makeInitialRequest()
{
    if (render_mode == 'price_list') {
          await Searcher.make_query({ silent: true, q: page_href_query, cat: page_href_cat_id })
    }
    else
    {
        await Searcher.make_query({id: item_id, silent: true });
        Searcher.disabled = true;
    }
}

// jobs that have to be done once dom is fully loaded
export default async function initPage()
{
    Renderer.renderMainFrame();
    await makeInitialRequest();

    // if user not on item page and user wasn't on item page
    if (!document.location.pathname.includes("item") && !(localStorage.prev_path || "").includes("item"))
    {
        // if user is on main page and got there from another place then ask him if he wants to restore position on page
        Renderer.show_alert(
            true,
            "Восстановить",
            `Вы можете вернуться на то место, где окончили посмотр в прошлый раз.
            <button data-dismiss='alert' data-role='restore-height' class='btn btn-success'>Вернуться</button>`,
            -1)
    }
    else
    {
        Renderer.restoreHeight();
    }
}
