class Component
{
	constructor(template, name)
    {
        this.tag_class;
        this.parser = new TagParser(template);
        this.name = name || "UNKNOWN";
        this.cache = false;

		// make each component own a stack
		// in hope for async rendering
		this.stack = new Stack();
    }

	isCached()
	{
		return this.cache;
	}

	render(context)
    {
        if (this.isCached())
        {
			let rendered_html = "";

			if (context.__locals__)
			{
				// render was called by another component (include tag)
				// inherit stack
				this.stack = context.__locals__.clone();
			}
			else
			{
				context.__locals__ = this.stack;
			}

            for (let renderable of this.cache)
            {
                rendered_html += renderable.render(context);
            }
			this.stack.empty();
            return rendered_html;
        }
        this.cache = [];

        let prs = this.parser;
		let html = "";

		while (prs.hasNext())
        {
            let prtag = this.tag_class;
			this.tag_class = TagManager.getTagClass(prs.content, prs.ptr)

            let char = prs.get();
            // if (this.tag_class){
            //     print(this.tag_class.name, "orange");
            // }
			if (this.tag_class && this.tag_class.isCompoundStart())
            {
                try
                {
                    let block = prs.readBlock()
                    this.cache.push(new RenderableHtmlWrapper(html));
                    html = "";
                    this.cache.push(block);
                }
                catch (e)
                {
                    console.log("could not parse block");
                    print(prs.getDebugTextPeek(), "red");
                    console.log("line " + prs.line + " of " + this.name);
                    console.log("error", e);
                    throw e;
                }

            }
			else if (this.tag_class)
            {
                try{
                let tag = prs.readTag()
				//html += tag.render(context);
                this.cache.push(new RenderableHtmlWrapper(html));
                html = "";
                this.cache.push(tag);
                }
                catch (e)
                {
                    console.log("could not parse Tag:");
                    print(prs.getDebugTextPeek(), "red");
                    console.log("line " + prs.line + " of " + this.name);
                    console.log("error", e);
                    throw e;
                }
            }
            else
            {
                html += char;
                prs.next();
            }
        }
        if (html)
            this.cache.push(new RenderableHtmlWrapper(html));

		return this.render(context);
    }
}
