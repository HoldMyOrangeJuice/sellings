class Expression extends ClassNameResolver
{
    constructor(expression_parts)
    {
        super();
        this.content = expression_parts;
        this.postfix = false;
    }

    toPostfix()
    {
        this.postfix = true;
        let operator_stack = []
        let postfix_expr = []
        for (let part of this.content)
        {
            if (part instanceof Operand || part instanceof Expression)
            {
                postfix_expr.push(part);
            }

            else if (part instanceof Operator)
            {
                if (operator_stack.length == 0)
                {
                    operator_stack.push(part);
                }
                else if (part.priority <= operator_stack[operator_stack.length-1].priority)
                {
                    while(operator_stack.length != 0 &&
                        part.priority <= operator_stack[operator_stack.length-1].priority)
                    {
                        let top = operator_stack.pop();
                        postfix_expr.push(top);
                    }
                    operator_stack.push(part);
                }
                else
                {
                    operator_stack.push(part);
                }
            }
            else
            {
                throw new Error("Unexpected type in parsed expr array: " + typeof part + ":" + part);
            }
        }
        while(operator_stack.length)
        {
            let top = operator_stack.pop();
            postfix_expr.push(top);
        }

        this.content = postfix_expr;
        return this;
    }

    evaluate(context)
    {
        // Do some magic to evaluate operators and stuff
        // basically i only need to avaluate operators
        // since they are only possible actions in expression
        // also function calls idk
        // i wanna make function call an operator too
        // left value is callable right value is block with args
        if(!this.postfix)
        {
            this.toPostfix()
        }

        let result_stack = []

        for (let part of this.content)
        {
            if (part instanceof Operand)
            {
                result_stack.push(part);
            }

            else if (part instanceof Operator)
            {
                let right = part.constructor.unary ? undefined : result_stack.pop();
                let left = result_stack.pop();

                let result = part.evaluate(context, left, right);
                if (!(result instanceof Operand))
                {
                    console.log(result);
                    throw new Error("Operator did not return expression");
                }
                result_stack.push(result);
            }

            else if (part instanceof Expression)
            {
                result_stack.push(part.evaluate(context));
            }

            else
            {
                console.warn("Unexpected part of expression: ", part.contructor.name);
            }
        }
        if (result_stack.length > 1)
        {
            throw new Error("evaluation of expr failed: stack size: " + result_stack.length);
        }
        if (!result_stack.length)
        {
            // if stack is empty - evaluated expression was empty
            return undefined;
        }
        let result = result_stack[0];
        return result.evaluate ? result.evaluate(context) : result;
    }
}
