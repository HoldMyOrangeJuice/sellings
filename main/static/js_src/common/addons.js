'use strict';

$(document).on('input', ".auto-adjust", (e)=>{
    resize(e.target);
})

$('body').on('focus', ".auto-adjust", (e)=>{
    resize(e.target);
})

function scrolled()
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

function isMobile()
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
function delayedResize ()
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


function serializeForm(jq_form)
{
    let str = jq_form.serialize();

    let keyValuePairs = str.split('&');
    let json = {};
    for(let i= 0, len = keyValuePairs.length,tmp,key,value; i <len; i++) {
        tmp = keyValuePairs[i].split('=');
        key = decodeURIComponent(tmp[0]);
        value = decodeURIComponent(tmp[1]);
        if(key.search(/\[\]$/) != -1) {
            tmp = key.replace(/\[\]$/,'');
            json[tmp] = json[tmp] || [];
            json[tmp].push(value);
        }
        else {
            json[key] = value;
        }
    }
    return json;
}
