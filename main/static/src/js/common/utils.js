'use strict';

$(document).on('input', ".auto-adjust", (e)=>{
    resize(e.target);
})

$('body').on('focus', ".auto-adjust", (e)=>{
    resize(e.target);
})

export function scrolled()
{
    return (window.pageYOffset !== undefined) ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop;
}

function uuid()
{
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function isMobile()
{
  try{
      document.createEvent("TouchEvent");
      return true;
  }
  catch(e){ return false; }
}

function resize (text)
{
    //text.focus();
    //text.select();
    text.style.height = 'auto';
    text.style.height = text.scrollHeight+'px';
}

/* 0-timeout to get the already changed text */
function delayedResize()
{
    window.setTimeout(resize, 0);
}

function ensure_textarea_size()
{
    for (let elem of $(".auto-adjust"))
    {
        resize(elem);
    }
}

export function getImagePath(file_or_files)
{
    if (file_or_files instanceof Array)
    {
        return file_or_files.map(i=>get_image_path(i));
    }
    return `${MEDIA_URL}images/items/${file_or_files}`
}

export function getMinImagePath(filename)
{
    return `${MEDIA_URL}images/min/${filename}`
}
