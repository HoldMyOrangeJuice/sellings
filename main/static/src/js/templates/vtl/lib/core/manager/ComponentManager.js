import {isMobile} from "../../../../../common/utils"

class CManager
{
    static MOBILE_ONLY=1;
    static DESKTOP_ONLY=2;
    static UNIVERSAL=3;

    static register(component, name, mode)
    {
        if (mode == this.UNIVERSAL ||
           (mode == this.MOBILE_ONLY && isMobile() ||
            mode == this.DESKTOP_ONLY && !isMobile()))
            {
                //console.log(`component ${name} registered: ${mode} mobile: ${isMobile()}`);
                this[name] = component;
                component.name = name;
            }
    }
}

export default CManager
