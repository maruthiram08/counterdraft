export interface Coordinates {
    top: number;
    left: number;
    height: number;
}

/**
 * Calculates the (x, y) coordinates of the caret or selection end
 * in a textarea by creating a mirrored hidden div.
 */
export function getCaretCoordinates(
    element: HTMLTextAreaElement,
    position: number
): Coordinates {
    // Mirror properties
    const properties = [
        'direction',
        'boxSizing',
        'width',
        'height',
        'overflowX',
        'overflowY',
        'borderTopWidth',
        'borderRightWidth',
        'borderBottomWidth',
        'borderLeftWidth',
        'paddingTop',
        'paddingRight',
        'paddingBottom',
        'paddingLeft',
        'fontStyle',
        'fontVariant',
        'fontWeight',
        'fontStretch',
        'fontSize',
        'fontSizeAdjust',
        'lineHeight',
        'fontFamily',
        'textAlign',
        'textTransform',
        'textIndent',
        'textDecoration',
        'letterSpacing',
        'wordSpacing',
        'tabSize',
        'MozTabSize',
    ];

    const isFirefox = (window as any).mozInnerScreenX != null;

    const div = document.createElement('div');
    div.id = 'input-textarea-caret-position-mirror-div';
    document.body.appendChild(div);

    const style = div.style;
    const computed = window.getComputedStyle(element);

    style.whiteSpace = 'pre-wrap';
    if (element.nodeName !== 'INPUT')
        style.wordWrap = 'break-word';  // only for textarea-s

    // Position off-screen
    style.position = 'absolute';
    style.visibility = 'hidden';

    // Transfer properties
    properties.forEach(prop => {
        style[prop as any] = computed[prop as any];
    });

    if (isFirefox) {
        if (element.scrollHeight > parseInt(computed.height))
            style.overflowY = 'scroll';
    } else {
        style.overflow = 'hidden';
    }

    div.textContent = element.value.substring(0, position);

    // The second special handling for input type="text" vs textarea:
    // spaces need to be replaced with non-breaking spaces - http://stackoverflow.com/a/13402035/1269037
    if (element.nodeName === 'INPUT')
        div.textContent = div.textContent.replace(/\s/g, '\u00a0');

    const span = document.createElement('span');
    // Wrapping must be replicated *exactly*, including when a long word gets
    // onto the next line, with whitespace at the end of the line before #758
    span.textContent = element.value.substring(position) || '.';  // || because a completely empty faux span doesn't render at all
    div.appendChild(span);

    const coordinates = {
        top: span.offsetTop + parseInt(computed['borderTopWidth']),
        left: span.offsetLeft + parseInt(computed['borderLeftWidth']),
        height: parseInt(computed['lineHeight'])
    };

    document.body.removeChild(div);

    return coordinates;
}
