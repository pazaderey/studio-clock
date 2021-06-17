import React from 'react';
import { useSelector } from 'react-redux';
import { ErrorBlock } from './ErrorBlock';
import { Loading } from './Loading';
import { MainClock } from './MainClock';
import { MediaClock } from './MediaClock';
import { ObsClock } from './ObsClock';

export const Clocks = () => {
    const state = useSelector(state => state)

    if (!state.loading && (!state.socket || state.error))
        return <ErrorBlock />

    return (
        <div className="Clocks">
            {state.loading ? <Loading size={"large"}/> :
                <>
                    <MainClock />
                    <ObsClock />
                    <MediaClock />
                </>
            }
        </div>
    )
}