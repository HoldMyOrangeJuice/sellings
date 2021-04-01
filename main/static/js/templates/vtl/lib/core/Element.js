class Element
{
    constructor(jq_selector)
    {
        this.__proto__.__proto__ = $(jq_selector);
    }

    addComponent(component, context)
    {
        if (! (component instanceof Component))
        {
            console.log(component);
            throw new Error("component is not instance of Component")
        }
        let cached = component.isCached();
        let start_time = Date.now();
        let html = component.render(context || {});
        this.append(html);
        let end_time = Date.now();
        console.log(`Rendering of ${component.name} took ${end_time-start_time}ms.\nwas cached: ${!!cached}`);

        return this;
    }

    addComponentAsync(component, context)
    {

        let promise = new Promise((resolve, reject)=>
        {
            setTimeout(()=>
            {
                this.addComponent(component, context)
                if (resolve)
                    resolve();
            }, 0);
        })
        return promise;
    }
}
