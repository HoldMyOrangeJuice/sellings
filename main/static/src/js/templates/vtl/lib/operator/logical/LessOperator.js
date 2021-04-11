import Operator from "../BaseOperator"
class LessOperator extends Operator
{
    static sign = "<";
    static priority = 10;
    static runnable = (left, right)=>left < right;
}
export default LessOperator
