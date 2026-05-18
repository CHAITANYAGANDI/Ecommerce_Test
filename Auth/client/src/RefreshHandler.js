import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchCurrentClient } from './utils';


function RefreshHandler({ setIsAuthenticated }) {

    const location = useLocation();
    const navigate = useNavigate();


    useEffect(() => {
        let cancelled = false;
        fetchCurrentClient().then((client) => {
            if (cancelled) return;
            if (client) {
                setIsAuthenticated && setIsAuthenticated(true);
                if (location.pathname === '/' || location.pathname === '/auth/login' || location.pathname === '/auth/register') {
                    navigate('/auth/dashboard', { replace: false });
                }
            } else {
                setIsAuthenticated && setIsAuthenticated(false);
            }
        });
        return () => { cancelled = true; };
    }, [location, navigate, setIsAuthenticated]);

    return null;
}

export default RefreshHandler;
