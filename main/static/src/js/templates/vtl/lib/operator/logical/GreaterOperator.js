import Operator from "../BaseOperator"
class GreaterOperator extends Operator
{
    static sign = ">";
    static priority = 10;
    static runnable = (left, right)=>left > right;
}
export default GreaterOperator
