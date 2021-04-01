class Tag extends ClassNameResolver
{
    // some static things here
    static related_tags = ["not Implemented"]
    static modifier = "not Implemented";
    static tag_name = "not Implemented";
    static compoundClass = "Compound";
    static closeTagClass = null;
    static mainTagClass = null;

    static tagEndPrefix = "end";

    constructor(content)
    {
        super();
        this.content = content;
        // parsed expression instance
        this.parsed_cache;
    }

    isCached()
    {
        return this.parsed_cache instanceof ParsedExpression;
    }

    static isCompoundStart()
    {
        throw new Error("Not Implenemted")
    }

    static isCompoundEnd()
    {
        throw new Error("Not Implenemted")
    }

    static isCompoundable()
    {
        return !!(this.resolve(this.mainTagClass)?.compoundClass);
    }

    // returns opening of tag: {% if
    static getTagStart()
    {
        return `{${this.modifier}${this.isCompoundEnd()?this.tagEndPrefix:""}${this.tag_name}`
    }

    // returns closing part of tag: $}
    static getTagEnd()
    {
        return `${this.modifier}}`
    }

    static getClosingClass()
    {
        return this.resolve(this.closeTagClass);
    }

    createCompound()
    {
        let cls = this.constructor.resolve(this.constructor.compoundClass)
        return new cls();
    }
    normalizeString(clean)
    {
        for(; clean[0]==" "||[0]=="\n"; clean = clean.substr(1));
        for(; clean[clean.length-1]==" "||clean[clean.length-1]=="\n"; clean = clean.substr(0, clean.length-1));
        return clean;
    }
    clean()
    {
        let clean = "";
        let parser = new TagParser(this.content);

        let skip_open_tag = parser.hasSequenceNext(this.constructor.getTagStart());
        let skip_end_tag = false;
        while (skip_end_tag == false && parser.hasNext())
        {
            skip_end_tag = parser.hasSequenceNext(this.constructor.getTagEnd());
            parser.next();
        }

        // idk why +1 needs to be there
        // seems to work tho
        clean = this.content.substring(skip_open_tag+1, this.content.length - skip_end_tag);

        // now we should remove all redunant spaces
        // remove all for now
        //clean = clean.replaceAll(" ", "");

        return this.normalizeString(clean);
    }

    // used to display html and to do additional processing
    render(context)
    {
        throw new Error("Not Implenemted")
    }

    // default evaluation behaviour.
    // will just eval expression within passed context
    evaluate(context)
    {
        if (this.isCached())
        {
            let parsed = this.parsed_cache.evaluate(context);
            return parsed;
        }

        let parser = new ExpressionParser(this.clean());
        this.parsed_cache = parser.parse();
        return this.evaluate(context);
    }
}
