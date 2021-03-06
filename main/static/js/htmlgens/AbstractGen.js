'use strict';

function notImplemented()
{
    throw Error("Not implemented");
}

// required interface
class IHtmlGen
{
    static gen_image_viewer(active_path, images){ notImplemented(); }
    static gen_main_frame_content(){ notImplemented(); }
    static gen_frame_entry(item){ notImplemented(); }
    static gen_cat_frame(category){ notImplemented(); }
    static gen_main_frame_content(){ notImplemented(); }
    static gen_mono_frame(){ notImplemented(); }
    static gen_fav_table(fav_items){ notImplemented(); }
}

class Component
{
    constructor(params)
    {

    }
}

let navbar = Component("test ({{var1}})")
