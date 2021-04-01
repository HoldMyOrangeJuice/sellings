class TagParser extends Parser
{

    constructor(content, ptr)
    {
        super(content, ptr);
    }

    // returns tag object or false
	hasTagNext(tagClass)
    {
        if (!tagClass || typeof tagClass != "function")
        {
            throw new Error("tag object can't be " + tagClass)
        }

        let inner = "";
        let ptr = this.ptr;

        let open_seq = tagClass.getTagStart();
        let seq_len = this.hasSequenceNext(open_seq, ptr)

        if (seq_len)
        {
            //ptr += seq_len;
            while(!this.hasSequenceNext(tagClass.getTagEnd(), ptr))
            {
                let char = this.content[ptr];
                if (ptr == this.content.length)
                {
                    throw new Error("Parse Error")
                }

                inner += char;
                ptr++;
            }
            return new tagClass(inner + tagClass.getTagEnd());
        }
        return false;
    }

	// for example {% if %} tag has {% else %} or {% else if %} or {% endif %}
	compoundHasRelatedTagNext(block)
    {
        if (!block)
        {
            print("block class is null", "red");
            return false;
            //throw new Error("trying to read next tag when there is no tag")
        }
        let mainTag = this.constructor.resolve(block.constructor.mainTagClass);


		for (let tagClass of mainTag.related_tags) {
            let cls = this.constructor.resolve(tagClass);
            let tag = this.hasTagNext(cls);
			if (tag){
				return tag
            }
        }
		return this.constructor.resolve(mainTag?.getClosingClass()) &&
        this.hasTagNext( this.constructor.resolve(mainTag.getClosingClass()) )
    }

    // returns whole tag constructon wrapped in tag obj:
    // {% a + b %}
	readTag(leave_ptr_where_it_is)
    {
		let content = ""
        let tag = TagManager.getTagClass(this.content, this.ptr);
        let ptr = this.ptr;

        let tag_end_sequence = tag.getTagEnd();
		while (ptr < this.content.length)
		{

            let char = this.content[ptr];
            let squence_len = this.hasSequenceNext(tag_end_sequence, ptr);

            if (squence_len)
            {
                content += tag_end_sequence;

                // jump over end tag
                ptr += squence_len;

                if (!leave_ptr_where_it_is)
                {
                     // add one so pointer points to new char
                     // and not to closing tag
                     this.ptr = ptr+1;
                }

                let tagObj = new tag(content);

                //print(`tag read done at line: ${this.line}`, "green")

                return tagObj;
            }
			content += char;
			ptr++
		}

        throw new Error("parse Error");

    }

    // returns full tag without moving ptr
	peekReadTag() {
        return this.readTag(true);
    }

    // reads everything from tag to start of other tag
    // so next call to readCompound will start at tag for sure
	readCompound(block)
    {
        // we know there is tag at the start
        let headTag = this.readTag();
        let compound = headTag.createCompound();
        let html = "";
        let contentRenderable = new RenderableContent();


		while(this.hasNext())
        {
            let char = this.get();
			this.tag_class = TagManager.getTagClass(this.content, this.ptr);

            if (this.tag_class) {

                // recursively read compund to exclude situations when
                // closing tag of inner compound closes outer compound
                if (this.tag_class.isCompoundStart())
                {
                    contentRenderable.add(new RenderableHtmlWrapper(html))
                    contentRenderable.add(this.readBlock());
                    html = "";
                }

                // parse tags that are not compounds
                else if (!this.tag_class.isCompoundable())
                {
                    contentRenderable.add(new RenderableHtmlWrapper(html));
                    contentRenderable.add(this.readTag());
                    html = "";
                }
            }

			if (this.compoundHasRelatedTagNext(block))
            {
                contentRenderable.add(new RenderableHtmlWrapper(html));

				compound.head = headTag
				compound.content = contentRenderable;
                //console.log("end of compound: ", compound);
				return compound;
			}

            // make sure not to save first char of tag
            // todo FIX THIS MESS
            if (!this.tag_class)
            {
                html += char;
                this.next();
            }
        }
        throw new Error("reached end while serching for closing tag\nyor template is bad")
    }

	readBlock()
	{
		let opening_tag = this.peekReadTag();
        let blockClass = BlockManager.getBlockClass(opening_tag.constructor);
        let block = new blockClass();

        //print("======= read block " + blockClass.name + " =======", "green");

		while (!this.peekReadTag().constructor.isCompoundEnd())
		{
			let compound = this.readCompound(block)
			block.add(compound)
		}
		this.readTag() // move pointer from end tag
        //print("block:", "green");
        //console.log(block);
		return block;
	}
}
