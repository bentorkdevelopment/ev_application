import { Text, TextInput } from 'react-native';

export const setCustomText = () => {
    const customTextProps = {
        originalStyle: Text.defaultProps?.style || {},
    };

    // Set default font family and weight
    const fontStyle = {
        fontFamily: 'Montserrat',
        fontWeight: '400', // Mapping 450 -> 400
    };

    if (Text.defaultProps) {
        Text.defaultProps.style = [customTextProps.originalStyle, fontStyle];
    } else {
        // For newer RN versions where Text.defaultProps might be undefined/immutable
        // We might need a different approach or this is a best-effort.
        Text.defaultProps = {};
        Text.defaultProps.style = fontStyle;
    }

    // TextInput
    const customInputProps = {
        originalStyle: TextInput.defaultProps?.style || {},
    };
    if (TextInput.defaultProps) {
        TextInput.defaultProps.style = [customInputProps.originalStyle, fontStyle];
    } else {
        TextInput.defaultProps = {};
        TextInput.defaultProps.style = fontStyle;
    }
};
