import TagParser from "../../parse/TagParser"
import Linker from "../Linker"

class TagManager
{
    // execute tag should be last since it does not have prefix.
    // that means execute tag will match anything

    static getTagClass(content, ptr)
    {
        for (let tagClass of Linker.getRegisteredTags())
        {

            let parser = new TagParser(content, ptr)

            let cls = tagClass;
            if (parser.hasTagNext(cls))
            {
                return cls;
            }
        }

        return false;
    }
}

export default TagManager
