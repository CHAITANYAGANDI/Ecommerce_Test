import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchCurrentUser } from './utils';


function RefreshHandler({ setIsAuthenticated }) {

    const location = useLocation();
    const navigate = useNavigate();


    useEffect(() => {
        let cancelled = false;
        fetchCurrentUser().then((user) => {
            if (cancelled) return;
            if (user) {
                setIsAuthenticated && setIsAuthenticated(true);
                if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/signup') {
                    navigate('/home', { replace: false });
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
