// components/sniffer_views/EmojiView.js
export default {
    props: ['mascotState', 'mascotStatusText'],
    template: `
        <div class="emoji-habitat" @click="handleTap">
            <div class="emoji-face"
                 :class="'mascot-' + mascotState"
                 :style="{ color: faceColor }">
                {{ mascotFace }}
            </div>
            <div class="emoji-status">{{ mascotStatusText }}</div>
        </div>
    `,
    computed: {
        mascotFace() {
            const faces = { 'alert': '🚨(✧Д✧)🚨', 'dead': '😵(x_x)😵', 'alive': '🐾(•̀ᴗ•́)و🐾', 'sleeping': '💤(-_-)zzz' };
            return faces[this.mascotState] || faces['sleeping'];
        },
        faceColor() {
            const colors = { 'alert': '#ff2d55', 'dead': '#ff9500', 'alive': '#34c759', 'sleeping': '#8e8e93' };
            return colors[this.mascotState] || colors['sleeping'];
        }
    },
    methods: {
        handleTap() {
            this.$emit('interact', []);
        }
    }
}