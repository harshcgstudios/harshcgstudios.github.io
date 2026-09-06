import * as THREE from 'three';

const VolumeRenderShader1 = {
  name: 'VolumeRenderShader1',
  uniforms: {
    'u_size': { value: new THREE.Vector3( 1, 1, 1 ) },
    'u_renderstyle': { value: 0 },
    'u_renderthreshold': { value: 0.5 },
    'u_clim': { value: new THREE.Vector2( 1, 1 ) },
    'u_data': { value: null },
    'u_cmdata': { value: null },
    'u_modelMatrixInverse': { value: new THREE.Matrix4() },
    'u_modelMatrixInverseTranspose': { value: new THREE.Matrix4() }
  },
  vertexShader: /* glsl */`
    varying vec3 v_position;
    varying vec3 v_position_world;

    void main() {
        vec4 position4 = vec4(position, 1.0);
        v_position = position;
        v_position_world = (modelMatrix * position4).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * position4;
    }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    precision mediump sampler3D;

    uniform vec3 u_size;
    uniform int u_renderstyle;
    uniform float u_renderthreshold;
    uniform vec2 u_clim;

    uniform sampler3D u_data;
    uniform sampler2D u_cmdata;

    uniform mat4 u_modelMatrixInverse;
    uniform mat4 u_modelMatrixInverseTranspose;

    varying vec3 v_position;
    varying vec3 v_position_world;

    const int MAX_STEPS = 512;
    const int REFINEMENT_STEPS = 4;
    const float relative_step_size = 0.4;
    const float shininess = 40.0;

    void cast_mip(vec3 start_loc, vec3 step, int nsteps);
    void cast_iso(vec3 start_loc, vec3 step, int nsteps, vec3 view_ray_world);
    void cast_dvr(vec3 start_loc, vec3 step, int nsteps, vec3 view_ray_world);

    float sample1(vec3 texcoords);
    vec4 apply_colormap(float val);
    vec4 add_lighting(float val, vec3 loc, vec3 step, vec3 view_ray_world);

    float pseudo_random(vec2 co) {
        return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
        // Ray direction in world space, pointing from fragment to camera
        vec3 view_ray_world = normalize(cameraPosition - v_position_world);

        // Transform ray direction to local space without normalizing it
        // This preserves the physical scale along the ray vector
        vec3 ray_dir_local = (u_modelMatrixInverse * vec4(view_ray_world, 0.0)).xyz;

        // Slab-based ray/AABB intersection in local space:
        // v_position is the exit point on the back face of the cuboid
        vec3 t1 = (vec3(-0.5) - v_position) / ray_dir_local;
        vec3 t2 = (u_size - vec3(0.5) - v_position) / ray_dir_local;
        vec3 tmax = max(t1, t2);
        float distance = min(min(tmax.x, tmax.y), tmax.z);

        // Camera distance in world space (to correctly handle camera inside volume)
        float camera_dist_world = length(cameraPosition - v_position_world);
        float ray_len = min(distance, camera_dist_world);

        // Decide step count using the physical distance in world coordinates
        int nsteps = int(ray_len / relative_step_size + 0.5);
        if (nsteps < 1)
            discard;

        // Cap nsteps to MAX_STEPS to prevent GPU timeout/lag and ray clipping
        if (nsteps > MAX_STEPS) {
            nsteps = MAX_STEPS;
        }

        // Entry point inside the volume (in local space)
        vec3 front = v_position + ray_dir_local * ray_len;
        
        // Convert segment to texture coordinate step
        vec3 step = ((v_position - front) / u_size) / float(nsteps);
        vec3 start_loc = (front + vec3(0.5)) / u_size;

        if (u_renderstyle == 0) {
            // Apply stochastic jittering to MIP mode to smooth out ray slices
            float jitter = pseudo_random(gl_FragCoord.xy);
            cast_mip(start_loc + step * jitter, step, nsteps);
        } else if (u_renderstyle == 1) {
            // ISO solid view should not be jittered to prevent dithered/speckled surface noise
            cast_iso(start_loc, step, nsteps, view_ray_world);
        } else if (u_renderstyle == 2) {
            // DVR mode benefits from jittering to remove slice/wood-grain banding artifacts
            float jitter = pseudo_random(gl_FragCoord.xy);
            cast_dvr(start_loc + step * jitter, step, nsteps, view_ray_world);
        }

        if (gl_FragColor.a < 0.05)
            discard;
    }

    float sample1(vec3 texcoords) {
        /* Sample float value from a 3D texture. Assumes intensity data. */
        if (any(lessThan(texcoords, vec3(0.0))) || any(greaterThan(texcoords, vec3(1.0)))) {
            return 0.0;
        }
        return texture(u_data, texcoords.xyz).r;
    }

    vec4 apply_colormap(float val) {
        return texture2D(u_cmdata, vec2(val, 0.5));
    }

    void cast_mip(vec3 start_loc, vec3 step, int nsteps) {
        float max_val = -1e6;
        int max_i = 100;
        vec3 loc = start_loc;

        for (int iter = 0; iter < MAX_STEPS; iter++) {
            if (iter >= nsteps)
                break;
            float val = sample1(loc);
            if (val > max_val) {
                max_val = val;
                max_i = iter;
            }
            loc += step;
        }

        // Refine location
        vec3 iloc = start_loc + step * (float(max_i) - 0.5);
        vec3 istep = step / float(REFINEMENT_STEPS);
        for (int i = 0; i < REFINEMENT_STEPS; i++) {
            max_val = max(max_val, sample1(iloc));
            iloc += istep;
        }

        gl_FragColor = apply_colormap(max_val);
    }

    void cast_iso(vec3 start_loc, vec3 step, int nsteps, vec3 view_ray_world) {
        gl_FragColor = vec4(0.0);
        vec3 dstep = 2.5 / u_size;
        vec3 loc = start_loc;

        float low_threshold = u_renderthreshold - 0.02 * (u_clim[1] - u_clim[0]);

        for (int iter = 0; iter < MAX_STEPS; iter++) {
            if (iter >= nsteps)
                break;

            float val = sample1(loc);

            if (val > low_threshold) {
                // Take the last interval in smaller steps
                vec3 iloc = loc - 0.5 * step;
                vec3 istep = step / float(REFINEMENT_STEPS);
                for (int i = 0; i < REFINEMENT_STEPS; i++) {
                    val = sample1(iloc);
                    if (val > u_renderthreshold) {
                        vec4 color = add_lighting(val, iloc, dstep, view_ray_world);
                        if (color.a >= 0.05) {
                            gl_FragColor = color;
                            gl_FragColor.a = 1.0; // Force fully opaque for solid isosurface view
                            return;
                        }
                    }
                    iloc += istep;
                }
            }

            loc += step;
        }
    }

    void cast_dvr(vec3 start_loc, vec3 step, int nsteps, vec3 view_ray_world) {
        gl_FragColor = vec4(0.0);
        vec3 dstep = 2.5 / u_size;
        vec3 loc = start_loc;
        vec4 color_acc = vec4(0.0);

        for (int iter = 0; iter < MAX_STEPS; iter++) {
            if (iter >= nsteps)
                break;

            float val = sample1(loc);

            // Sharp threshold to completely remove low-density tissues like skin when we slide past it
            if (val >= u_renderthreshold) {
                vec4 color = apply_colormap(val);

                if (color.a > 0.01) {
                    // Higher opacity (0.75) to make tissues look solid, matching the reference image
                    float step_opacity = color.a * 0.75;

                    // Compute shading/lighting at this step
                    vec4 lit_color = add_lighting(val, loc, dstep, view_ray_world);

                    // Accumulate color using front-to-back blending
                    color_acc.rgb += (1.0 - color_acc.a) * lit_color.rgb * step_opacity;
                    color_acc.a += (1.0 - color_acc.a) * step_opacity;

                    // Early ray termination if accumulated opacity is high enough
                    if (color_acc.a >= 0.95) {
                        color_acc.a = 1.0;
                        break;
                    }
                }
            }

            loc += step;
        }

        gl_FragColor = color_acc;
    }

    vec4 add_lighting(float val, vec3 loc, vec3 step, vec3 view_ray_world) {
        vec3 V = normalize(view_ray_world);

        // Calculate gradient in local voxel coordinate space
        vec3 N_local;
        float val1, val2;
        val1 = sample1(loc + vec3(-step[0], 0.0, 0.0));
        val2 = sample1(loc + vec3(+step[0], 0.0, 0.0));
        N_local[0] = val1 - val2;
        
        float val3 = sample1(loc + vec3(0.0, -step[1], 0.0));
        float val4 = sample1(loc + vec3(0.0, +step[1], 0.0));
        N_local[1] = val3 - val4;
        
        float val5 = sample1(loc + vec3(0.0, 0.0, -step[2]));
        float val6 = sample1(loc + vec3(0.0, 0.0, +step[2]));
        N_local[2] = val5 - val6;

        // Transform normal to world space using the inverse transpose matrix
        vec3 N = normalize( (u_modelMatrixInverseTranspose * vec4(N_local, 0.0)).xyz );

        // Flip normal so it points towards viewer
        float Nselect = float(dot(N, V) > 0.0);
        N = (2.0 * Nselect - 1.0) * N;

        // Lighting calculation in world space
        vec4 ambient_color = vec4(0.15, 0.15, 0.15, 0.15);
        vec4 diffuse_color = vec4(0.0);
        vec4 specular_color = vec4(0.0);

        vec3 L = normalize(view_ray_world);
        float lambertTerm = clamp(dot(N, L), 0.0, 1.0);
        vec3 H = normalize(L + V);
        float specularTerm = pow(max(dot(H, N), 0.0), shininess);

        diffuse_color += lambertTerm * vec4(0.85, 0.85, 0.85, 0.85);
        specular_color += specularTerm * vec4(0.3, 0.3, 0.3, 0.3);

        vec4 final_color;
        vec4 color = apply_colormap(val);
        final_color = color * (ambient_color + diffuse_color) + specular_color;
        final_color.a = color.a;
        return final_color;
    }
  `
};

export { VolumeRenderShader1 };
