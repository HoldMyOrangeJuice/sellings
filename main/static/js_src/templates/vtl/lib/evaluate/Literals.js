class Literal extends Operand
{
    static literals = ["StringLiteral", "NumberLiteral", "BooleanLiteral"]
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
        for (let literalClass of this.literals)
        {
            let cls = this.resolve(literalClass)

            if (cls.matches(expr.expression))
            {
                return new cls(expr.expression);
            }
        }
    }
}

class StringLiteral extends Literal
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

class NumberLiteral extends Literal
{
    static regex = /^[0-9]+\.*[0-9]*$/;
    constructor(number)
    {
        super(parseInt(number))
    }
}

class BooleanLiteral extends Literal
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
