import Operator from "./BaseOperator"
class MinusOperator extends Operator
{
    static sign = "-";
    static priority = 1;
    static runnable = (left, right)=>left-right;
    constructor(expr)
    {
        super(expr);
    }
}
export default MinusOperator
