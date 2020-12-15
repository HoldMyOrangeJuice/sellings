function listen_to_adjusts()
{
$(".auto-adjust").on("input", (e)=>
    {
    console.log("adjust", e)
//
//        e.target.style.width = "1px";
//        console.log("width: ", e.target.scrollWidth)
//        e.target.style.width = (e.target.scrollWidth + 20) + "px";

        e.target.style.height = "1px";
        console.log("height: ", e.target.scrollHeight)
        e.target.style.height = e.target.scrollHeight+"px";
    })
}

$(document).ready(function()
{
// also called when table formed on ajax
    listen_to_adjusts();
})

