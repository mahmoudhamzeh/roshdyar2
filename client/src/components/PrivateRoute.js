import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { isLoggedIn, loginUrl } from '../api';

const PrivateRoute = ({ component: Component, ...rest }) => {
    return (
        <Route
            {...rest}
            render={(props) =>
                isLoggedIn() ? (
                    <Component {...props} />
                ) : (
                    <Redirect
                        to={loginUrl(`${props.location.pathname}${props.location.search || ''}`)}
                    />
                )
            }
        />
    );
};

export default PrivateRoute;
