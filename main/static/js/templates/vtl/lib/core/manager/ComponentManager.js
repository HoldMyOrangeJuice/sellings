const MOBILE_ONLY=1, DESKTOP_ONLY=2, UNIVERSAL=3;

class CManager
{
    static register(component, name, mode)
    {
        if (mode == UNIVERSAL ||
           (mode == MOBILE_ONLY && isMobile() ||
            mode == DESKTOP_ONLY && !isMobile()))
            {
                console.log(`component ${name} registered: ${mode} mobile: ${isMobile()}`);
                this[name] = component;
                component.name = name;
            }
    }
}
