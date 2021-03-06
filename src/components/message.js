/*
 * Copyright 2015, Yahoo Inc.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

import {Component, PropTypes, createElement, isValidElement} from 'react';
import {intlShape} from '../types';
import {
    invariantIntlContext,
    shallowEquals,
    shouldIntlComponentUpdate,
} from '../utils';

export default class FormattedMessage extends Component {
    constructor(props, context) {
        super(props, context);
        invariantIntlContext(context);
    }

    shouldComponentUpdate(nextProps, ...next) {
        const {values}             = this.props;
        const {values: nextValues} = nextProps;

        if (!shallowEquals(nextValues, values)) {
            return true;
        }

        // Since `values` has already been checked, we know they're not
        // different, so the current `values` are carried over so the shallow
        // equals comparison on the other props isn't affected by the `values`.
        let nextPropsToCheck = {
            ...nextProps,
            values,
        };

        return shouldIntlComponentUpdate(this, nextPropsToCheck, ...next);
    }

    render() {
        const {formatMessage} = this.context.intl;

        const {
            id,
            description,
            defaultMessage,
            values,
            tagName,
            children,
        } = this.props;

        // Creates a token with a random UID that should not be guessable or
        // conflict with other parts of the `message` string.
        let uid = Math.floor(Math.random() * 0x10000000000).toString(16);
        let tokenRegexp = new RegExp(`(@__ELEMENT-${uid}-\\d+__@)`, 'g');

        let generateToken = (() => {
            let counter = 0;
            return () => `@__ELEMENT-${uid}-${counter += 1}__@`;
        })();

        let tokenizedValues = {};
        let elements        = {};

        // Iterates over the `props` to keep track of any React Element values
        // so they can be represented by the `token` as a placeholder when the
        // `message` is formatted. This allows the formatted message to then be
        // broken-up into parts with references to the React Elements inserted
        // back in.
        Object.keys(values).forEach((name) => {
            let value = values[name];

            if (isValidElement(value)) {
                let token = generateToken();
                tokenizedValues[name] = token;
                elements[token]       = value;
            } else {
                tokenizedValues[name] = value;
            }
        });

        let descriptor       = {id, description, defaultMessage};
        let formattedMessage = formatMessage(descriptor, tokenizedValues);

        // Split the message into parts so the React Element values captured
        // above can be inserted back into the rendered message. This approach
        // allows messages to render with React Elements while keeping React's
        // virtual diffing working properly.
        let nodes = formattedMessage
            .split(tokenRegexp)
            .filter((part) => !!part)
            .map((part) => elements[part] || part);

        if (typeof children === 'function') {
            return children(...nodes);
        }

        return createElement(tagName, null, ...nodes);
    }
}

FormattedMessage.displayName = 'FormattedMessage';

FormattedMessage.contextTypes = {
    intl: intlShape,
};

FormattedMessage.propTypes = {
    id            : PropTypes.string.isRequired,
    description   : PropTypes.string,
    defaultMessage: PropTypes.string,

    values  : PropTypes.object,
    tagName : PropTypes.string,
    children: PropTypes.func,
};

FormattedMessage.defaultProps = {
    values : {},
    tagName: 'span',
};
