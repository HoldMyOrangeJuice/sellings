class Stack
{
    constructor()
    {
        this.stack = [{"__root-layer__":true}];
    }

    addLayer()
    {
        this.stack.push({});
    }

    put(name, value)
    {
        this.stack[this.stack.length-1][name]=value;
    }

    popLayer()
    {
        this.stack.pop();
    }

    empty()
    {
        this.stack = [{"__root-layer__":true}];
    }

    find(varname)
    {
        let value;
        for (let scope of this.stack)
        {
            if (scope[varname] != undefined)
            {
                value = scope[varname]
            }
        }
        return value;
    }

    clone()
    {
        return new Stack(jQuery.extend({}, this.stack));
    }
}

function getValue(name, context)
{
    if (!context.__locals__)throw new Error("__locals__ not in context")
    // serch for var everywhere
    let global_var = window[name];
    let context_var = context[name];
    let stack_var = context.__locals__.find(name);
    // deprecated?
    let chain_var = context.__chain_parent ? context.__chain_parent[name] : undefined;

    if (context_var != undefined)
        return context_var
    if (global_var != undefined)
        return global_var
    if (stack_var!=undefined)
        return stack_var
    if (chain_var != undefined)
        return chain_var

    // variable was not found :(
    throw new Error("[VTL] " + name + " is not defined")
}
function registerCustomFilter(f,cb)
{
    if (!window.vtl)window.vtl={}
    if (!window.vtl.filters)window.vtl.filters={}
    window.vtl.filters[f] = cb;
}
