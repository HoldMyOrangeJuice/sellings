import Expression from "../evaluate/Expression"

class ParsedExpression extends Expression
{
    constructor(expression_parts)
    {
        super(expression_parts)
    }
}

export default ParsedExpression
