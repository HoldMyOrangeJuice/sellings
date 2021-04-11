import Operand from "./BaseOperand"

class Literal extends Operand
{
    static __literals = ["StringLiteral", "NumberLiteral", "BooleanLiteral"]
    constructor(value)
    {
        super(value)
    }

    evaluate(context)
    {
        return this.expression;
    }

    static construct(expr)
    {
        for (let literalClass of this.getCachedList("__literals"))
        {
            let cls = literalClass;

            if (cls.matches(expr.expression))
            {
                return new cls(expr.expression);
            }
        }
    }
}

export class StringLiteral extends Literal
{
    static regex = /"[A-aZ-z_]+[A-aZ-z0-9_]*"/;
    constructor(text)
    {
        super(text)
    }
    evaluate(context)
    {
        // TODO: figure out why some string literals are parsed as ""abc"" and some are "abc"
        if (/^"(.*)"$/.test(this.expression))
        // return group inside braces
            return this.expression.match('"(.*)"')[1]
        return this.expression;
    }
}

export class NumberLiteral extends Literal
{
    static regex = /^[0-9]+\.*[0-9]*$/;
    constructor(number)
    {
        super(parseInt(number))
    }
}

export class BooleanLiteral extends Literal
{
    static matches(expr)
    {
        return expr.toLowerCase() === "true" || expr.toLowerCase() === "false";
    }

    evaluate(c)
    {
        return this.expression.toLowerCase() === "true";
    }
}

class ArrayLiteral extends Literal
{

}

class ObjectLiteral extends Literal
{

}
