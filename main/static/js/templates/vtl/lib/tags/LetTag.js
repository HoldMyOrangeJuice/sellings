class LetTag extends Tag
{
    static related_tags = []
    static modifier = "$";
    static tag_name = "let";

    constructor(content)
    {
        super(content)
        this.cached_rvalue;
        this.cached_lvalue;
    }

    isCached()
    {
        return this.cached_rvalue instanceof ParsedExpression
    }

    static isCompoundStart()
    {
        return false;
    }

    static isCompoundEnd()
    {
        return false;
    }


    // overrides caching mechanism of base tag class
    evaluate(context)
    {
        if (this.isCached())
        {
            context.__locals__.put(this.cached_lvalue, this.cached_rvalue.evaluate(context));
            return;
        }

        let cont = this.clean();

        let lvalue="";
        let rvalue="";
        let eq = false;
        let ptr = 0;

        while(ptr < cont.length)
        {
            let char = cont[ptr]
            if (eq){
                rvalue += char
            }
            else if (char === "=")
            {
                eq = true;
            }
            else
            {
                lvalue += char;
            }
            ptr++;
        }
        lvalue = this.normalizeString(lvalue);
        rvalue = this.normalizeString(rvalue);

        let parsed = new ExpressionParser(rvalue).parse();
        this.cached_rvalue = parsed;
        this.cached_lvalue = lvalue;
        return this.evaluate(context);
    }

    render(context)
    {
        this.evaluate(context);
        return "";
    }
}
