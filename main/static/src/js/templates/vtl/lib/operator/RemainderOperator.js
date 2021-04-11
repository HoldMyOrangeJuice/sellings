import Operator from "./BaseOperator"
class RemainderOperator extends Operator
{
    static sign = "%";
    static priority = 1;
    static runnable = (left, right)=>left % right;
}
export default RemainderOperator
