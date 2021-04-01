

class ExpressionParser extends Parser
{
    constructor(expression, ptr, parser_nesting_level_debug=0)
    {
        super(expression, ptr);
        this.parsed = []
        this.nesting_level = parser_nesting_level_debug;
        this.text_buffer = "";
    }

    saveBuffer()
    {
        if (!this.text_buffer)
            return;

        try
        {
            let operand = Operand.construct(this.text_buffer);
            this.addElement(operand);
        }
        catch(e)
        {
            if (this.operator_grab_failed)
            {
                console.log("at " + this.getDebugTextPeek() + "\n" + this.ptr + " : " + this.line);
                throw e
            }

            let parser = new ExpressionParser(this.text_buffer);
            parser.operator_grab_failed = true;
            let expr = parser.parse();
            for (let part of expr.content)
                this.addElement(part);
        }
        this.text_buffer = ""
    }

    clearTextBuffer()
    {
        this.text_buffer = "";
    }

    addToTextBuffer(text)
    {
        this.text_buffer += text;
    }

    fork()
    {
        let parser = new ExpressionParser(this.content, this.ptr, this.nesting_level+1);
        return parser;
    }

    last(idx)
    {
        return this.parsed[this.parsed.length-(!idx?1:idx+1)];
    }


    addElement(elem)
    {
        if (elem instanceof RoundBracketBlock)
        {
            //if (this.content)
            // expression + braces = function call
            if (this.last() instanceof Operand || this.last() instanceof Expression)
            {
                if (this.last(1) instanceof NewOperator)
                {
                    let brace = elem;
                    let callable = this.parsed.pop();
                    let newoperator = this.parsed.pop();
                    this.parsed.push(callable);
                    this.parsed.push(newoperator);
                    this.parsed.push(brace);
                    return;
                }
                else
                {
                    this.parsed.push(new CallOperator());
                }
            }
        }
        this.parsed.push(elem);
    }

    testGrabOperator()
    {
        for (let operatorClass of Operator.registeredInstances)
        {

            let cls = Operator.resolve(operatorClass);
            let offset = this.hasSequenceNext(cls.sign, this.curptr());

            if (offset !== false)
            {
                // jump over operator
                this.ptr += offset;
                return new cls();
            }
        }
    }

    testGrabBrace()
    {
        if (!BraceBlock.isOpenBrace(this.get()))
            return false;

        let cls = BraceBlock.getType(this.get());


        let braceParser = this.fork();

        // jump over that brace
        braceParser.next();
        while(braceParser.hasNext())
        {
            let char = braceParser.get();

            if (BraceBlock.isOpenBrace(char))
            {
                braceParser.saveBuffer();
                let block = braceParser.testGrabBrace();
                braceParser.addElement(block);
            }
            else if (BraceBlock.isCloseBrace(char))
            {
                braceParser.saveBuffer();
                this.ptr = braceParser.ptr;
                braceParser.next()
                return new cls(braceParser.parsed);
            }
            else
            {
                braceParser.addToTextBuffer(char);
            }
            braceParser.next()
        }
        throw new Error("Closing brace not found");
    }

    parse()
    {
        let start_time = Date.now();
        this.clearTextBuffer();
        let quoted_text = "";
        let open_quote = {}
        let quote = ()=>open_quote["\'"] || open_quote["\""]

        while(this.hasNext())
        {
            let char = this.get();

            if ( (char == " " || char == "\n") && !quote())
            {
                this.saveBuffer();
                this.next();
                continue;
            }

            //console.log("[" + this.nesting_level + "]" + " (#" + (this.curptr()) + ") " + char);

            // TODO escape quotes
            if (char == "\"" || char == "\'")
            {
                open_quote[char] = !open_quote[char]

                if(!quote())
                {
                    this.addElement(new StringLiteral(quoted_text));
                    quoted_text="";
                }
                else
                {
                    this.saveBuffer();
                }
                this.next();
                continue;
            }

            if(quote())
            {
                quoted_text += char;
                this.next();
                continue;
            }

            // check for operators
            let operator = this.testGrabOperator();
            if (operator)
            {
                this.saveBuffer();
                this.addElement(operator);
                this.next();
                continue;
            }

            // check for brace blocks
            let brace_block = this.testGrabBrace();
            if(brace_block)
            {
                this.saveBuffer();
                this.addElement(brace_block);
                this.next();
                continue;
            }

            this.addToTextBuffer(char);
            this.next();
        }
        this.saveBuffer();
        let done_in = Date.now() - start_time;
        total_render_time += done_in;
        return new ParsedExpression(this.parsed);
    }
}
