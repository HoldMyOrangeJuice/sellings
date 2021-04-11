import Linker from "../core/Linker"
class Operand
{
    constructor(expression)
    {
        //if (! (expression instanceof Array))
        //    throw new Error("Expressions must be parsed list");

        this.expression = expression;
    }

    static construct(expression)
    {

        for (let classType of Linker.getRegisteredOperands())
        {
            let cls = classType;

            if (cls.matches(expression))
            {
                return new cls(expression)
            }
        }
        throw new Error("Unxepected expression: '" + expression + "'");
    }

    static matches(expr)
    {
        if (this.regex){
            return this.regex.test(expr);
        }
        throw new Error('Not Implemented')
    }

    evaluate(context)
    {
        throw new Error("Not Implemented");
    }
}
export default Operand
