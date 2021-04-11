import Linker from "../Linker"

class BlockManager
{
    static getBlockClass(tag)
    {
        return Linker.getBlockClass(Linker.getMainTagClass(tag));
    }
}
export default BlockManager
