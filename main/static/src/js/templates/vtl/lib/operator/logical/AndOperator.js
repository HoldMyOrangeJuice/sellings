import Operator from "../BaseOperator"

class AndOperator extends Operator
{
    static sign = "&&";
    static priority = 10;
    static runnable = (left, right)=>left && right;
}
export default AndOperator
