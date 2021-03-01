$(document).on('input', ".auto-adjust", (e)=>{
    resize(e.target);
})

// $(document).on('cut paste drop keydown',".auto-adjust", (e)=>{
//     console.log("edit", e.target);
//     delayedResize(e.target);
// })

$('body').on('focus', ".auto-adjust", (e)=>{
    resize(e.target);
})

function resize (text)
{
    //text.focus();
    //text.select();
    text.style.height = 'auto';
    text.style.height = text.scrollHeight+'px';
}

/* 0-timeout to get the already changed text */
function delayedResize ()
{
    window.setTimeout(resize, 0);
}

function ensure_textarea_size()
{
    for (elem of $(".auto-adjust"))
    {
        resize(elem);
    }
}
