const state = {
    appStatus: 'initial',
    activeTab: 'source', 
    translationText: '',
    sentences: [],
    error: null,
    isAutoPlay: false,
    isClickToPlayLocked: false,
};

const listeners = [];

export function subscribe(listener) {
    listeners.push(listener);
    return function unsubscribe() {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
    };
}

export function setState(newState) {
    Object.assign(state, newState);
    console.log("State updated:", state);
    listeners.forEach(listener => listener(state));
}

export function getState() {
    return { ...state };
}
