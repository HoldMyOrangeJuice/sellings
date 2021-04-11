import Operator from "../BaseOperator"
class NotEquealOperator extends Operator
{
    static sign = "!=";
    static priority = 5;
    static runnable = (left, right)=>left != right;
}
export default NotEquealOperator
