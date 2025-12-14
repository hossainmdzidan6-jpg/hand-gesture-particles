// shaders.js

// --- ধাপ ৪: Shader Code ---

const SHAPE_GENERATOR = `
vec3 getTemplatePosition(vec3 originalPos, float templateID, float time) {
    vec3 newPos = originalPos;
    
    // Heart Shape (Template 0)
    if (templateID < 1.0) {
        float r = length(originalPos.xy) * 0.5;
        float angle = atan(originalPos.y, originalPos.x);
        float pulse = sin(time * 2.0) * 0.1 + 1.0;
        
        float t = angle + originalPos.z * 1.0;
        newPos.x = sin(t) * sin(t) * sin(t) * 10.0 * r * 0.1 * pulse;
        newPos.y = (13.0*cos(t) - 5.0*cos(2.0*t) - 2.0*cos(3.0*t) - cos(4.0*t)) * 0.005 * r * pulse;
        newPos.z = originalPos.z;
    } 
    // Flower (Template 1)
    else if (templateID < 2.0) {
        float r = length(originalPos.xy) * 0.5;
        float angle = atan(originalPos.y, originalPos.x);
        float petal = sin(angle * 5.0) * 0.2;
        
        newPos.x = cos(angle + petal) * r * 2.0;
        newPos.y = sin(angle + petal) * r * 2.0;
        newPos.z = originalPos.z * 0.5 + cos(angle * 3.0 + time) * 0.5;
    }
    // Saturn (Template 2)
    else if (templateID < 3.0) {
        float r = length(originalPos.xy);
        float angle = atan(originalPos.y, originalPos.x);
        
        newPos.x = cos(angle) * 3.0;
        newPos.y = sin(angle) * 3.0;
        newPos.z = sin(originalPos.z * 10.0 + time) * 0.5;
    }
    // Firework (Template 3)
    else {
        newPos = originalPos * (1.0 + sin(time * 5.0) * 0.5); 
    }
    
    return newPos;
}
`;

function getVertexShader() {
    return `
        uniform float uTime;
        uniform float uExpansionFactor;
        uniform float uTemplateSwitch;
        uniform float uSize;

        attribute vec3 aColor;
        attribute float aTemplateID;

        varying vec3 vColor;
        
        ${SHAPE_GENERATOR}

        void main() {
            vColor = aColor;
            
            vec3 finalPosition = position;
            
            // Template-based position calculation
            if (uTemplateSwitch > 0.5) {
                finalPosition = getTemplatePosition(position, aTemplateID, uTime);
            } else {
                finalPosition = position;
                finalPosition.y += sin(position.x * 5.0 + uTime) * 0.05;
            }

            // Gesture-based expansion
            finalPosition *= uExpansionFactor;
            
            vec4 mvPosition = modelViewMatrix * vec4(finalPosition, 1.0);
            gl_PointSize = uSize * (200.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
    `;
}

function getFragmentShader() {
    return `
        uniform vec3 uBaseColor;
        uniform float uTime;
        varying vec3 vColor;

        void main() {
            float r = 0.0, alpha = 1.0;
            vec2 cxy = 2.0 * gl_PointCoord - 1.0;
            r = dot(cxy, cxy);
            
            alpha = smoothstep(1.0, 0.5, r); 

            vec3 finalColor = uBaseColor * vColor; 
            finalColor *= (sin(uTime * 3.0 + length(gl_PointCoord)) * 0.1 + 0.9);
            
            gl_FragColor = vec4(finalColor, alpha);
        }
    `;
}