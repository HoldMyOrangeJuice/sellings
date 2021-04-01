class ForBlock extends Block
{
    static mainTagClass = "ForTag";
    static iterateOperator = "of"
    static unpackVarnamesRegex = `[^\\s^,]*(?=\\s*[,\\s])`;

    isCached(){
        return this.cached_rvalue instanceof ParsedExpression;
    }
    render(context)
    {
        let comp = this.compounds[0];

        if (this.isCached())
        {
            let html = "";
            let iterable = this.cached_rvalue.evaluate(context)//getValue(rval, context);
            for (let packed of iterable)
            {
                if (packed instanceof Array && this.cached_varnames.length != packed.length)
                {
                    throw new Error(`Expected ${this.cached_varnames.length} args but got ${packed.length}`)
                }

                for (let [i, varname] of this.cached_varnames.entries())
                {
                    let value;
                    if (packed instanceof Array)
                    {
                        value = packed[i];
                    }
                    else
                    {
                        value = packed;
                    }
                    context[varname] = value;
                }
                html += comp.content.render(context);
            }
            delete context.temp_iterator;
            return html;
        }

        let expr = comp.head.clean()
        if (!expr.includes(ForBlock.iterateOperator))
        {
            return;
        }

        let [lval, rval] = expr.split(ForBlock.iterateOperator)
        let varnames = [];
        for (let vname of lval.matchAll(ForBlock.unpackVarnamesRegex))
        {
            if (vname[0]){
                varnames.push(vname[0]);
            }
        }

        this.cached_rvalue = new ExpressionParser(rval).parse()//getValue(rval, context);
        this.cached_varnames = varnames;
        return this.render(context);
    }
}
