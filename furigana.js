const ENTER_KEY = 13;
const FURIGANA_SVG_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 109 109">
<g id="kvg:StrokePaths_03042" style="stroke:currentColor;fill:none;stroke-width:10;stroke-linecap:round;stroke-linejoin:round;">
    <g id="kvg:03042">
        <path id="kvg:03042-s1" d="M31.01,33c0.88,0.88,2.75,1.82,5.25,1.75c8.62-0.25,20-2.12,29.5-4.25c1.51-0.34,4.62-0.88,6.62-0.5"/>
        <path id="kvg:03042-s2" d="M49.76,17.62c0.88,1,1.82,3.26,1.38,5.25c-3.75,16.75-6.25,38.13-5.13,53.63c0.41,5.7,1.88,10.88,3.38,13.62"/>
        <path id="kvg:03042-s3" d="M65.63,44.12c0.75,1.12,1.16,4.39,0.5,6.12c-4.62,12.26-11.24,23.76-25.37,35.76c-6.86,5.83-15.88,3.75-16.25-8.38c-0.34-10.87,13.38-23.12,32.38-26.74c12.42-2.37,27,1.38,30.5,12.75c4.05,13.18-3.76,26.37-20.88,30.49"/>
    </g>
</g>
</svg>`;
const FURIGANA_CSS_CLASS = 'cdx-furigana';

class Furigana {
    static get isInline() {
        return true;
    }

    static get sanitize() {
        return {
            ruby: (elt) => {
                if (elt.classList.contains(FURIGANA_CSS_CLASS)) {
                    return {
                        class: FURIGANA_CSS_CLASS
                    };
                } else {
                    return false;
                }
            },
            rt: (elt) => {
                if (elt.classList.contains(FURIGANA_CSS_CLASS)) {
                    return {
                        class: FURIGANA_CSS_CLASS
                    };
                } else {
                    return false;
                }
            },
            rb: (elt) => {
                if (elt.classList.contains(FURIGANA_CSS_CLASS)) {
                    return {
                        class: FURIGANA_CSS_CLASS
                    };
                } else {
                    return false;
                }
            }
        };
    }

    /**
     * @param {{api: object}}  - Editor.js API
     */
    constructor({ api }) {
        this.api = api;
        this.inlineToolbar = api.inlineToolbar;
        this.data = undefined;
        this.nodes = {};
        this.cssClasses = {
            base: this.api.styles.inlineToolButton,
            active: this.api.styles.inlineToolButtonActive,
            input: 'ce-inline-tool-input'
        };

    }

    render() {
        this.nodes.button = document.createElement('button');
        this.nodes.button.type = 'button';
        this.nodes.button.innerHTML = FURIGANA_SVG_ICON;
        this.nodes.button.classList.add(this.cssClasses.base);
        return this.nodes.button;
    }

    renderActions() {
        this.nodes.input = document.createElement('input');
        this.nodes.input.placeholder = 'Add furigana…';
        this.nodes.input.classList.add(this.cssClasses.input);
        this.nodes.input.addEventListener('keydown', evt => this._enterPressed(evt));
        return this.nodes.input;
    }

    _addRuby(range, value) {
        if (this.currentTag) {
            let rtTag = this.currentTag.firstElementChild;
            rtTag.textContent = value;
            return;
        }

        const selectedText = range.extractContents();

        // Create ruby element
        const ruby = document.createElement('RUBY');
        ruby.classList.add(FURIGANA_CSS_CLASS)

        // Create rb element
        const rb = document.createElement('RB');
        rb.classList.add(FURIGANA_CSS_CLASS)
        rb.appendChild(selectedText);
        ruby.appendChild(rb);

        // Create rt element
        const rt = document.createElement('RT');
        rt.classList.add(FURIGANA_CSS_CLASS)
        rt.appendChild(document.createTextNode(value));
        ruby.appendChild(rt);

        // Insert new element
        range.insertNode(ruby);
    }

    _removeRuby(elt) {
        let rtTag = elt.querySelector('rt');
        elt.removeChild(rtTag);

        this.api.selection.expandToTag(elt);

        let sel = window.getSelection();
        let range = sel.getRangeAt(0);

        let unwrappedContent = range.extractContents();

        // Remove empty term-tag
        elt.parentNode.removeChild(elt);

        // Insert extracted content
        let txtContent = document.createTextNode(unwrappedContent.querySelector('rb').textContent);
        range.insertNode(txtContent);

        // Restore selection
        sel.removeAllRanges();
        sel.addRange(range);
    }

    _enterPressed(event) {
        if (event.keyCode === ENTER_KEY) {
            let value = this.nodes.input.value || '';
            value = value.trim();

            this._addRuby(this.savedSelectionRange, value);

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            this.inlineToolbar.close();
        }
    }

    surround(range) {
        if (range) {
            if (!this.inputOpened) {
                this._saveSelection();
            } else {
                this._restoreSelection();
            }

            const rubyTag = this.api.selection.findParentTag('RUBY', FURIGANA_CSS_CLASS);
            if (rubyTag) {
                this._removeRuby(rubyTag);
                this._closeActions();
                this.checkState();
                return
            }
        }

        this._toggleActions();
    }

    checkState(selection) {
        const rubyTag = this.api.selection.findParentTag('RUBY', FURIGANA_CSS_CLASS);
        this.currentTag = rubyTag;

        if (rubyTag) {
            this.nodes.button.classList.add(this.cssClasses.active);
            this._openActions(false);
            const rtTag = rubyTag.querySelector('rt');
            this.nodes.input.value = rtTag.innerText;
            this.api.selection.expandToTag(rubyTag);
            this._saveSelection();
        } else {
            this.nodes.button.classList.remove(this.cssClasses.active);
        }

        return !!rubyTag;
    }

    _toggleActions() {
        if (!this.inputOpened) {
            this._openActions(true);
        } else {
            this._closeActions();
        }
    }

    _openActions(needFocus) {
        this.nodes.input.classList.add('ce-inline-tool-input--showed');
        if (needFocus) {
            this.nodes.input.focus();
        }
        this.inputOpened = true;
    }

    _closeActions() {
        this.nodes.input.classList.remove('ce-inline-tool-input--showed');
        this.nodes.input.value = '';
        this.inputOpened = false;
    }

    clear() {
        this._closeActions();
        this.currentTag = null;
    }

    _saveSelection() {
        const selection = window.getSelection();
        this.savedSelectionRange = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
    }

    _restoreSelection() {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(this.savedSelectionRange);
    }
}
