---
title: Load a PBR Model
category: basic
---

This example demonstrates loading glTF model with PBR materials. PBR materials are usually used with [image based lighting](https://en.wikipedia.org/wiki/Image-based_lighting). ClayGL provide method `app.createAmbientCubemapLight` to load a HDR texture, do prefiltering, and the create an `AmbientCubeMap` with the prefilerted cubemap for specular lighting. In addition, it will also create an `AmbientSH` for diffuse lighting using technique called [spherical harmonics](https://en.wikipedia.org/wiki/Spherical_harmonics)

See [Basic Theory of Physically Based Rendering](https://www.marmoset.co/posts/basic-theory-of-physically-based-rendering/) to know more about PBR.