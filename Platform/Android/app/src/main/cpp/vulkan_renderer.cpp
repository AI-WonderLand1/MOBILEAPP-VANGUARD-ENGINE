#include <vulkan/vulkan.h>
#include <android_native_app_glue.h>
#include <android/log.h>
#include <vector>
#include <array>
#include <cstdlib>
#include <cstring>

#define LOG_TAG "VanguardGPU"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

struct VulkanState {
    VkInstance instance = VK_NULL_HANDLE;
    VkPhysicalDevice physicalDevice = VK_NULL_HANDLE;
    VkDevice device = VK_NULL_HANDLE;
    VkQueue graphicsQueue = VK_NULL_HANDLE;
    VkQueue presentQueue = VK_NULL_HANDLE;
    uint32_t graphicsQueueFamily = UINT32_MAX;
    uint32_t presentQueueFamily = UINT32_MAX;
    
    VkSurfaceKHR surface = VK_NULL_HANDLE;
    VkSwapchainKHR swapchain = VK_NULL_HANDLE;
    VkFormat swapchainFormat = VK_FORMAT_UNDEFINED;
    VkExtent2D swapchainExtent = {0, 0};
    std::vector<VkImage> swapchainImages;
    std::vector<VkImageView> swapchainImageViews;
    std::vector<VkFramebuffer> framebuffers;
    
    VkRenderPass renderPass = VK_NULL_HANDLE;
    VkPipelineLayout pipelineLayout = VK_NULL_HANDLE;
    VkPipeline pipeline = VK_NULL_HANDLE;
    
    VkCommandPool commandPool = VK_NULL_HANDLE;
    std::vector<VkCommandBuffer> commandBuffers;
    
    std::vector<VkSemaphore> imageAvailableSemaphores;
    std::vector<VkSemaphore> renderFinishedSemaphores;
    std::vector<VkFence> inFlightFences;
    
    uint32_t currentFrame = 0;
    bool framebufferResized = false;
    bool initialized = false;
};

static VulkanState g_state;
static struct android_app* g_app = nullptr;

VKAPI_ATTR VkBool32 VKAPI_CALL debugCallback(
    VkDebugUtilsMessageSeverityFlagBitsEXT severity,
    VkDebugUtilsMessageTypeFlagsEXT type,
    const VkDebugUtilsMessengerCallbackDataEXT* pCallbackData,
    void* pUserData) {
    if (severity >= VK_DEBUG_UTILS_MESSAGE_SEVERITY_WARNING_BIT_EXT) {
        LOGE("Validation: %s", pCallbackData->pMessage);
    }
    return VK_FALSE;
}

void createInstance() {
    VkApplicationInfo appInfo{};
    appInfo.sType = VK_STRUCTURE_TYPE_APPLICATION_INFO;
    appInfo.pApplicationName = "Vanguard GPU";
    appInfo.applicationVersion = VK_MAKE_VERSION(1, 0, 0);
    appInfo.pEngineName = "Vanguard";
    appInfo.engineVersion = VK_MAKE_VERSION(1, 0, 0);
    appInfo.apiVersion = VK_API_VERSION_1_3;
    
    const char* extensions[] = {
        VK_KHR_SURFACE_EXTENSION_NAME,
        VK_KHR_ANDROID_SURFACE_EXTENSION_NAME,
        VK_EXT_DEBUG_UTILS_EXTENSION_NAME
    };
    
    VkDebugUtilsMessengerCreateInfoEXT debugCreateInfo{};
    debugCreateInfo.sType = VK_STRUCTURE_TYPE_DEBUG_UTILS_MESSENGER_CREATE_INFO_EXT;
    debugCreateInfo.messageSeverity = VK_DEBUG_UTILS_MESSAGE_SEVERITY_VERBOSE_BIT_EXT |
                                      VK_DEBUG_UTILS_MESSAGE_SEVERITY_WARNING_BIT_EXT |
                                      VK_DEBUG_UTILS_MESSAGE_SEVERITY_ERROR_BIT_EXT;
    debugCreateInfo.messageType = VK_DEBUG_UTILS_MESSAGE_TYPE_GENERAL_BIT_EXT |
                                  VK_DEBUG_UTILS_MESSAGE_TYPE_VALIDATION_BIT_EXT |
                                  VK_DEBUG_UTILS_MESSAGE_TYPE_PERFORMANCE_BIT_EXT;
    debugCreateInfo.pfnUserCallback = debugCallback;
    
    VkInstanceCreateInfo createInfo{};
    createInfo.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO;
    createInfo.pApplicationInfo = &appInfo;
    createInfo.enabledExtensionCount = 3;
    createInfo.ppEnabledExtensionNames = extensions;
    createInfo.enabledLayerCount = 0;
    createInfo.pNext = &debugCreateInfo;
    
    if (vkCreateInstance(&createInfo, nullptr, &g_state.instance) != VK_SUCCESS) {
        LOGE("Failed to create Vulkan instance");
        return;
    }
    LOGI("Vulkan instance created");
}

void pickPhysicalDevice() {
    uint32_t deviceCount = 0;
    vkEnumeratePhysicalDevices(g_state.instance, &deviceCount, nullptr);
    if (deviceCount == 0) {
        LOGE("No Vulkan physical devices found");
        return;
    }
    
    std::vector<VkPhysicalDevice> devices(deviceCount);
    vkEnumeratePhysicalDevices(g_state.instance, &deviceCount, devices.data());
    
    for (auto device : devices) {
        VkPhysicalDeviceProperties props;
        vkGetPhysicalDeviceProperties(device, &props);
        
        VkPhysicalDeviceFeatures features;
        vkGetPhysicalDeviceFeatures(device, &features);
        
        uint32_t queueFamilyCount = 0;
        vkGetPhysicalDeviceQueueFamilyProperties(device, &queueFamilyCount, nullptr);
        std::vector<VkQueueFamilyProperties> queueFamilies(queueFamilyCount);
        vkGetPhysicalDeviceQueueFamilyProperties(device, &queueFamilyCount, queueFamilies.data());
        
        for (uint32_t i = 0; i < queueFamilyCount; i++) {
            if (queueFamilies[i].queueFlags & VK_QUEUE_GRAPHICS_BIT) {
                VkBool32 presentSupport = false;
                vkGetPhysicalDeviceSurfaceSupportKHR(device, i, g_state.surface, &presentSupport);
                
                if (presentSupport) {
                    g_state.physicalDevice = device;
                    g_state.graphicsQueueFamily = i;
                    g_state.presentQueueFamily = i;
                    LOGI("Selected GPU: %s", props.deviceName);
                    return;
                }
            }
        }
    }
    LOGE("No suitable GPU found");
}

void createLogicalDevice() {
    float queuePriority = 1.0f;
    VkDeviceQueueCreateInfo queueCreateInfo{};
    queueCreateInfo.sType = VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO;
    queueCreateInfo.queueFamilyIndex = g_state.graphicsQueueFamily;
    queueCreateInfo.queueCount = 1;
    queueCreateInfo.pQueuePriorities = &queuePriority;
    
    const char* deviceExtensions[] = { VK_KHR_SWAPCHAIN_EXTENSION_NAME };
    
    VkPhysicalDeviceFeatures deviceFeatures{};
    
    VkDeviceCreateInfo createInfo{};
    createInfo.sType = VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO;
    createInfo.queueCreateInfoCount = 1;
    createInfo.pQueueCreateInfos = &queueCreateInfo;
    createInfo.enabledExtensionCount = 1;
    createInfo.ppEnabledExtensionNames = deviceExtensions;
    createInfo.pEnabledFeatures = &deviceFeatures;
    
    if (vkCreateDevice(g_state.physicalDevice, &createInfo, nullptr, &g_state.device) != VK_SUCCESS) {
        LOGE("Failed to create logical device");
        return;
    }
    
    vkGetDeviceQueue(g_state.device, g_state.graphicsQueueFamily, 0, &g_state.graphicsQueue);
    vkGetDeviceQueue(g_state.device, g_state.presentQueueFamily, 0, &g_state.presentQueue);
    LOGI("Logical device created");
}

void createSurface() {
    VkAndroidSurfaceCreateInfoKHR createInfo{};
    createInfo.sType = VK_STRUCTURE_TYPE_ANDROID_SURFACE_CREATE_INFO_KHR;
    createInfo.window = g_app->window;
    
    if (vkCreateAndroidSurfaceKHR(g_state.instance, &createInfo, nullptr, &g_state.surface) != VK_SUCCESS) {
        LOGE("Failed to create Android surface");
        return;
    }
    LOGI("Surface created");
}

void createSwapchain() {
    VkSurfaceCapabilitiesKHR caps;
    vkGetPhysicalDeviceSurfaceCapabilitiesKHR(g_state.physicalDevice, g_state.surface, &caps);
    
    uint32_t formatCount = 0;
    vkGetPhysicalDeviceSurfaceFormatsKHR(g_state.physicalDevice, g_state.surface, &formatCount, nullptr);
    std::vector<VkSurfaceFormatKHR> formats(formatCount);
    vkGetPhysicalDeviceSurfaceFormatsKHR(g_state.physicalDevice, g_state.surface, &formatCount, formats.data());
    
    VkSurfaceFormatKHR surfaceFormat = formats[0];
    for (auto& f : formats) {
        if (f.format == VK_FORMAT_B8G8R8A8_SRGB && f.colorSpace == VK_COLOR_SPACE_SRGB_NONLINEAR_KHR) {
            surfaceFormat = f;
            break;
        }
    }
    
    uint32_t presentModeCount = 0;
    vkGetPhysicalDeviceSurfacePresentModesKHR(g_state.physicalDevice, g_state.surface, &presentModeCount, nullptr);
    std::vector<VkPresentModeKHR> presentModes(presentModeCount);
    vkGetPhysicalDeviceSurfacePresentModesKHR(g_state.physicalDevice, g_state.surface, &presentModeCount, presentModes.data());
    
    VkPresentModeKHR presentMode = VK_PRESENT_MODE_FIFO_KHR;
    for (auto mode : presentModes) {
        if (mode == VK_PRESENT_MODE_MAILBOX_KHR) {
            presentMode = mode;
            break;
        }
    }
    
    VkExtent2D extent = caps.currentExtent;
    if (extent.width == UINT32_MAX) {
        int width, height;
        ANativeWindow_getWidth(g_app->window);
        ANativeWindow_getHeight(g_app->window);
        extent.width = std::clamp((uint32_t)width, caps.minImageExtent.width, caps.maxImageExtent.width);
        extent.height = std::clamp((uint32_t)height, caps.minImageExtent.height, caps.maxImageExtent.height);
    }
    
    uint32_t imageCount = caps.minImageCount + 1;
    if (caps.maxImageCount > 0 && imageCount > caps.maxImageCount) {
        imageCount = caps.maxImageCount;
    }
    
    VkSwapchainCreateInfoKHR createInfo{};
    createInfo.sType = VK_STRUCTURE_TYPE_SWAPCHAIN_CREATE_INFO_KHR;
    createInfo.surface = g_state.surface;
    createInfo.minImageCount = imageCount;
    createInfo.imageFormat = surfaceFormat.format;
    createInfo.imageColorSpace = surfaceFormat.colorSpace;
    createInfo.imageExtent = extent;
    createInfo.imageArrayLayers = 1;
    createInfo.imageUsage = VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT;
    
    if (g_state.graphicsQueueFamily != g_state.presentQueueFamily) {
        createInfo.imageSharingMode = VK_SHARING_MODE_CONCURRENT;
        createInfo.queueFamilyIndexCount = 2;
        uint32_t queueFamilies[] = { g_state.graphicsQueueFamily, g_state.presentQueueFamily };
        createInfo.pQueueFamilyIndices = queueFamilies;
    } else {
        createInfo.imageSharingMode = VK_SHARING_MODE_EXCLUSIVE;
    }
    
    createInfo.preTransform = caps.currentTransform;
    createInfo.compositeAlpha = VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR;
    createInfo.presentMode = presentMode;
    createInfo.clipped = VK_TRUE;
    createInfo.oldSwapchain = VK_NULL_HANDLE;
    
    if (vkCreateSwapchainKHR(g_state.device, &createInfo, nullptr, &g_state.swapchain) != VK_SUCCESS) {
        LOGE("Failed to create swapchain");
        return;
    }
    
    g_state.swapchainFormat = surfaceFormat.format;
    g_state.swapchainExtent = extent;
    
    vkGetSwapchainImagesKHR(g_state.device, g_state.swapchain, &imageCount, nullptr);
    g_state.swapchainImages.resize(imageCount);
    vkGetSwapchainImagesKHR(g_state.device, g_state.swapchain, &imageCount, g_state.swapchainImages.data());
    
    g_state.swapchainImageViews.resize(imageCount);
    for (uint32_t i = 0; i < imageCount; i++) {
        VkImageViewCreateInfo viewInfo{};
        viewInfo.sType = VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO;
        viewInfo.image = g_state.swapchainImages[i];
        viewInfo.viewType = VK_IMAGE_VIEW_TYPE_2D;
        viewInfo.format = g_state.swapchainFormat;
        viewInfo.subresourceRange.aspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
        viewInfo.subresourceRange.baseMipLevel = 0;
        viewInfo.subresourceRange.levelCount = 1;
        viewInfo.subresourceRange.baseArrayLayer = 0;
        viewInfo.subresourceRange.layerCount = 1;
        
        vkCreateImageView(g_state.device, &viewInfo, nullptr, &g_state.swapchainImageViews[i]);
    }
    
    LOGI("Swapchain created: %dx%d, %d images", extent.width, extent.height, imageCount);
}

void createRenderPass() {
    VkAttachmentDescription colorAttachment{};
    colorAttachment.format = g_state.swapchainFormat;
    colorAttachment.samples = VK_SAMPLE_COUNT_1_BIT;
    colorAttachment.loadOp = VK_ATTACHMENT_LOAD_OP_CLEAR;
    colorAttachment.storeOp = VK_ATTACHMENT_STORE_OP_STORE;
    colorAttachment.stencilLoadOp = VK_ATTACHMENT_LOAD_OP_DONT_CARE;
    colorAttachment.stencilStoreOp = VK_ATTACHMENT_STORE_OP_DONT_CARE;
    colorAttachment.initialLayout = VK_IMAGE_LAYOUT_UNDEFINED;
    colorAttachment.finalLayout = VK_IMAGE_LAYOUT_PRESENT_SRC_KHR;
    
    VkAttachmentReference colorRef{};
    colorRef.attachment = 0;
    colorRef.layout = VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL;
    
    VkSubpassDescription subpass{};
    subpass.pipelineBindPoint = VK_PIPELINE_BIND_POINT_GRAPHICS;
    subpass.colorAttachmentCount = 1;
    subpass.pColorAttachments = &colorRef;
    
    VkSubpassDependency dependency{};
    dependency.srcSubpass = VK_SUBPASS_EXTERNAL;
    dependency.dstSubpass = 0;
    dependency.srcStageMask = VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT;
    dependency.srcAccessMask = 0;
    dependency.dstStageMask = VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT;
    dependency.dstAccessMask = VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT;
    
    VkRenderPassCreateInfo renderPassInfo{};
    renderPassInfo.sType = VK_STRUCTURE_TYPE_RENDER_PASS_CREATE_INFO;
    renderPassInfo.attachmentCount = 1;
    renderPassInfo.pAttachments = &colorAttachment;
    renderPassInfo.subpassCount = 1;
    renderPassInfo.pSubpasses = &subpass;
    renderPassInfo.dependencyCount = 1;
    renderPassInfo.pDependencies = &dependency;
    
    if (vkCreateRenderPass(g_state.device, &renderPassInfo, nullptr, &g_state.renderPass) != VK_SUCCESS) {
        LOGE("Failed to create render pass");
        return;
    }
    LOGI("Render pass created");
}

static const char* vertexShaderSrc = R"(
#version 450
layout(location = 0) in vec2 inPos;
layout(location = 1) in vec3 inColor;
layout(location = 0) out vec3 fragColor;
void main() {
    gl_Position = vec4(inPos, 0.0, 1.0);
    fragColor = inColor;
}
)";

static const char* fragmentShaderSrc = R"(
#version 450
layout(location = 0) in vec3 fragColor;
layout(location = 0) out vec4 outColor;
void main() {
    outColor = vec4(fragColor, 1.0);
}
)";

VkShaderModule createShaderModule(const char* src) {
    VkShaderModuleCreateInfo createInfo{};
    createInfo.sType = VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO;
    createInfo.codeSize = strlen(src);
    createInfo.pCode = reinterpret_cast<const uint32_t*>(src);
    VkShaderModule module;
    vkCreateShaderModule(g_state.device, &createInfo, nullptr, &module);
    return module;
}

void createGraphicsPipeline() {
    VkShaderModule vertModule = createShaderModule(vertexShaderSrc);
    VkShaderModule fragModule = createShaderModule(fragmentShaderSrc);
    
    VkPipelineShaderStageCreateInfo vertStage{};
    vertStage.sType = VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO;
    vertStage.stage = VK_SHADER_STAGE_VERTEX_BIT;
    vertStage.module = vertModule;
    vertStage.pName = "main";
    
    VkPipelineShaderStageCreateInfo fragStage{};
    fragStage.sType = VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO;
    fragStage.stage = VK_SHADER_STAGE_FRAGMENT_BIT;
    fragStage.module = fragModule;
    fragStage.pName = "main";
    
    VkPipelineShaderStageCreateInfo stages[] = { vertStage, fragStage };
    
    VkPipelineVertexInputStateCreateInfo vertexInput{};
    vertexInput.sType = VK_STRUCTURE_TYPE_PIPELINE_VERTEX_INPUT_STATE_CREATE_INFO;
    
    VkVertexInputBindingDescription bindingDesc{};
    bindingDesc.binding = 0;
    bindingDesc.stride = sizeof(float) * 5;
    bindingDesc.inputRate = VK_VERTEX_INPUT_RATE_VERTEX;
    
    VkVertexInputAttributeDescription attrDescs[2]{};
    attrDescs[0].binding = 0;
    attrDescs[0].location = 0;
    attrDescs[0].format = VK_FORMAT_R32G32_SFLOAT;
    attrDescs[0].offset = 0;
    attrDescs[1].binding = 0;
    attrDescs[1].location = 1;
    attrDescs[1].format = VK_FORMAT_R32G32B32_SFLOAT;
    attrDescs[1].offset = sizeof(float) * 2;
    
    vertexInput.vertexBindingDescriptionCount = 1;
    vertexInput.pVertexBindingDescriptions = &bindingDesc;
    vertexInput.vertexAttributeDescriptionCount = 2;
    vertexInput.pVertexAttributeDescriptions = attrDescs;
    
    VkPipelineInputAssemblyStateCreateInfo inputAssembly{};
    inputAssembly.sType = VK_STRUCTURE_TYPE_PIPELINE_INPUT_ASSEMBLY_STATE_CREATE_INFO;
    inputAssembly.topology = VK_PRIMITIVE_TOPOLOGY_TRIANGLE_LIST;
    inputAssembly.primitiveRestartEnable = VK_FALSE;
    
    VkViewport viewport{};
    viewport.x = 0;
    viewport.y = 0;
    viewport.width = (float)g_state.swapchainExtent.width;
    viewport.height = (float)g_state.swapchainExtent.height;
    viewport.minDepth = 0;
    viewport.maxDepth = 1;
    
    VkRect2D scissor{};
    scissor.offset = {0, 0};
    scissor.extent = g_state.swapchainExtent;
    
    VkPipelineViewportStateCreateInfo viewportState{};
    viewportState.sType = VK_STRUCTURE_TYPE_PIPELINE_VIEWPORT_STATE_CREATE_INFO;
    viewportState.viewportCount = 1;
    viewportState.pViewports = &viewport;
    viewportState.scissorCount = 1;
    viewportState.pScissors = &scissor;
    
    VkPipelineRasterizationStateCreateInfo rasterizer{};
    rasterizer.sType = VK_STRUCTURE_TYPE_PIPELINE_RASTERIZATION_STATE_CREATE_INFO;
    rasterizer.depthClampEnable = VK_FALSE;
    rasterizer.rasterizerDiscardEnable = VK_FALSE;
    rasterizer.polygonMode = VK_POLYGON_MODE_FILL;
    rasterizer.lineWidth = 1;
    rasterizer.cullMode = VK_CULL_MODE_BACK_BIT;
    rasterizer.frontFace = VK_FRONT_FACE_COUNTER_CLOCKWISE;
    rasterizer.depthBiasEnable = VK_FALSE;
    
    VkPipelineMultisampleStateCreateInfo multisampling{};
    multisampling.sType = VK_STRUCTURE_TYPE_PIPELINE_MULTISAMPLE_STATE_CREATE_INFO;
    multisampling.sampleShadingEnable = VK_FALSE;
    multisampling.rasterizationSamples = VK_SAMPLE_COUNT_1_BIT;
    
    VkPipelineColorBlendAttachmentState colorBlendAttachment{};
    colorBlendAttachment.colorWriteMask = VK_COLOR_COMPONENT_R_BIT | VK_COLOR_COMPONENT_G_BIT | VK_COLOR_COMPONENT_B_BIT | VK_COLOR_COMPONENT_A_BIT;
    colorBlendAttachment.blendEnable = VK_FALSE;
    
    VkPipelineColorBlendStateCreateInfo colorBlending{};
    colorBlending.sType = VK_STRUCTURE_TYPE_PIPELINE_COLOR_BLEND_STATE_CREATE_INFO;
    colorBlending.logicOpEnable = VK_FALSE;
    colorBlending.attachmentCount = 1;
    colorBlending.pAttachments = &colorBlendAttachment;
    
    VkPipelineLayoutCreateInfo pipelineLayoutInfo{};
    pipelineLayoutInfo.sType = VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO;
    vkCreatePipelineLayout(g_state.device, &pipelineLayoutInfo, nullptr, &g_state.pipelineLayout);
    
    VkGraphicsPipelineCreateInfo pipelineInfo{};
    pipelineInfo.sType = VK_STRUCTURE_TYPE_GRAPHICS_PIPELINE_CREATE_INFO;
    pipelineInfo.stageCount = 2;
    pipelineInfo.pStages = stages;
    pipelineInfo.pVertexInputState = &vertexInput;
    pipelineInfo.pInputAssemblyState = &inputAssembly;
    pipelineInfo.pViewportState = &viewportState;
    pipelineInfo.pRasterizationState = &rasterizer;
    pipelineInfo.pMultisampleState = &multisampling;
    pipelineInfo.pColorBlendState = &colorBlending;
    pipelineInfo.layout = g_state.pipelineLayout;
    pipelineInfo.renderPass = g_state.renderPass;
    pipelineInfo.subpass = 0;
    pipelineInfo.basePipelineHandle = VK_NULL_HANDLE;
    
    if (vkCreateGraphicsPipelines(g_state.device, VK_NULL_HANDLE, 1, &pipelineInfo, nullptr, &g_state.pipeline) != VK_SUCCESS) {
        LOGE("Failed to create graphics pipeline");
    }
    
    vkDestroyShaderModule(g_state.device, vertModule, nullptr);
    vkDestroyShaderModule(g_state.device, fragModule, nullptr);
    LOGI("Graphics pipeline created");
}

void createFramebuffers() {
    g_state.framebuffers.resize(g_state.swapchainImageViews.size());
    for (size_t i = 0; i < g_state.swapchainImageViews.size(); i++) {
        VkImageView attachments[] = { g_state.swapchainImageViews[i] };
        
        VkFramebufferCreateInfo fbInfo{};
        fbInfo.sType = VK_STRUCTURE_TYPE_FRAMEBUFFER_CREATE_INFO;
        fbInfo.renderPass = g_state.renderPass;
        fbInfo.attachmentCount = 1;
        fbInfo.pAttachments = attachments;
        fbInfo.width = g_state.swapchainExtent.width;
        fbInfo.height = g_state.swapchainExtent.height;
        fbInfo.layers = 1;
        
        vkCreateFramebuffer(g_state.device, &fbInfo, nullptr, &g_state.framebuffers[i]);
    }
    LOGI("Framebuffers created: %zu", g_state.framebuffers.size());
}

void createCommandPool() {
    VkCommandPoolCreateInfo poolInfo{};
    poolInfo.sType = VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO;
    poolInfo.queueFamilyIndex = g_state.graphicsQueueFamily;
    poolInfo.flags = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT;
    vkCreateCommandPool(g_state.device, &poolInfo, nullptr, &g_state.commandPool);
}

void createCommandBuffers() {
    g_state.commandBuffers.resize(g_state.swapchainImageViews.size());
    
    VkCommandBufferAllocateInfo allocInfo{};
    allocInfo.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO;
    allocInfo.commandPool = g_state.commandPool;
    allocInfo.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY;
    allocInfo.commandBufferCount = (uint32_t)g_state.commandBuffers.size();
    
    vkAllocateCommandBuffers(g_state.device, &allocInfo, g_state.commandBuffers.data());
}

void createSyncObjects() {
    size_t count = g_state.swapchainImageViews.size();
    g_state.imageAvailableSemaphores.resize(count);
    g_state.renderFinishedSemaphores.resize(count);
    g_state.inFlightFences.resize(count);
    
    VkSemaphoreCreateInfo semInfo{};
    semInfo.sType = VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO;
    
    VkFenceCreateInfo fenceInfo{};
    fenceInfo.sType = VK_STRUCTURE_TYPE_FENCE_CREATE_INFO;
    fenceInfo.flags = VK_FENCE_CREATE_SIGNALED_BIT;
    
    for (size_t i = 0; i < count; i++) {
        vkCreateSemaphore(g_state.device, &semInfo, nullptr, &g_state.imageAvailableSemaphores[i]);
        vkCreateSemaphore(g_state.device, &semInfo, nullptr, &g_state.renderFinishedSemaphores[i]);
        vkCreateFence(g_state.device, &fenceInfo, nullptr, &g_state.inFlightFences[i]);
    }
}

void recordCommandBuffer(VkCommandBuffer cmd, uint32_t imageIndex) {
    VkCommandBufferBeginInfo beginInfo{};
    beginInfo.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO;
    vkBeginCommandBuffer(cmd, &beginInfo);
    
    VkRenderPassBeginInfo rpInfo{};
    rpInfo.sType = VK_STRUCTURE_TYPE_RENDER_PASS_BEGIN_INFO;
    rpInfo.renderPass = g_state.renderPass;
    rpInfo.framebuffer = g_state.framebuffers[imageIndex];
    rpInfo.renderArea.offset = {0, 0};
    rpInfo.renderArea.extent = g_state.swapchainExtent;
    
    VkClearValue clearColor{};
    clearColor.color = {{0.1f, 0.2f, 0.3f, 1.0f}};
    rpInfo.clearValueCount = 1;
    rpInfo.pClearValues = &clearColor;
    
    vkCmdBeginRenderPass(cmd, &rpInfo, VK_SUBPASS_CONTENTS_INLINE);
    vkCmdBindPipeline(cmd, VK_PIPELINE_BIND_POINT_GRAPHICS, g_state.pipeline);
    
    VkViewport viewport{};
    viewport.x = 0;
    viewport.y = 0;
    viewport.width = (float)g_state.swapchainExtent.width;
    viewport.height = (float)g_state.swapchainExtent.height;
    viewport.minDepth = 0;
    viewport.maxDepth = 1;
    vkCmdSetViewport(cmd, 0, 1, &viewport);
    
    VkRect2D scissor{};
    scissor.offset = {0, 0};
    scissor.extent = g_state.swapchainExtent;
    vkCmdSetScissor(cmd, 0, 1, &scissor);
    
    vkCmdDraw(cmd, 3, 1, 0, 0);
    
    vkCmdEndRenderPass(cmd);
    vkEndCommandBuffer(cmd);
}

void recreateSwapchain() {
    int width = 0, height = 0;
    while (width == 0 || height == 0) {
        width = ANativeWindow_getWidth(g_app->window);
        height = ANativeWindow_getHeight(g_app->window);
        if (width == 0 || height == 0) {
            usleep(100000);
        }
    }
    
    vkDeviceWaitIdle(g_state.device);
    
    for (auto fb : g_state.framebuffers) vkDestroyFramebuffer(g_state.device, fb, nullptr);
    for (auto view : g_state.swapchainImageViews) vkDestroyImageView(g_state.device, view, nullptr);
    vkDestroySwapchainKHR(g_state.device, g_state.swapchain, nullptr);
    vkDestroyRenderPass(g_state.device, g_state.renderPass, nullptr);
    vkDestroyPipeline(g_state.device, g_state.pipeline, nullptr);
    vkDestroyPipelineLayout(g_state.device, g_state.pipelineLayout, nullptr);
    
    createSwapchain();
    createRenderPass();
    createGraphicsPipeline();
    createFramebuffers();
    
    for (auto& cmd : g_state.commandBuffers) {
        recordCommandBuffer(cmd, 0);
    }
    
    g_state.framebufferResized = false;
}

void drawFrame() {
    vkWaitForFences(g_state.device, 1, &g_state.inFlightFences[g_state.currentFrame], VK_TRUE, UINT64_MAX);
    
    uint32_t imageIndex;
    VkResult result = vkAcquireNextImageKHR(g_state.device, g_state.swapchain, UINT64_MAX,
                                           g_state.imageAvailableSemaphores[g_state.currentFrame],
                                           VK_NULL_HANDLE, &imageIndex);
    
    if (result == VK_ERROR_OUT_OF_DATE_KHR || result == VK_SUBOPTIMAL_KHR || g_state.framebufferResized) {
        recreateSwapchain();
        return;
    } else if (result != VK_SUCCESS) {
        LOGE("Failed to acquire swapchain image");
        return;
    }
    
    vkResetFences(g_state.device, 1, &g_state.inFlightFences[g_state.currentFrame]);
    vkResetCommandBuffer(g_state.commandBuffers[imageIndex], 0);
    recordCommandBuffer(g_state.commandBuffers[imageIndex], imageIndex);
    
    VkSubmitInfo submitInfo{};
    submitInfo.sType = VK_STRUCTURE_TYPE_SUBMIT_INFO;
    
    VkSemaphore waitSemaphores[] = { g_state.imageAvailableSemaphores[g_state.currentFrame] };
    VkPipelineStageFlags waitStages[] = { VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT };
    submitInfo.waitSemaphoreCount = 1;
    submitInfo.pWaitSemaphores = waitSemaphores;
    submitInfo.pWaitDstStageMask = waitStages;
    submitInfo.commandBufferCount = 1;
    submitInfo.pCommandBuffers = &g_state.commandBuffers[imageIndex];
    
    VkSemaphore signalSemaphores[] = { g_state.renderFinishedSemaphores[g_state.currentFrame] };
    submitInfo.signalSemaphoreCount = 1;
    submitInfo.pSignalSemaphores = signalSemaphores;
    
    if (vkQueueSubmit(g_state.graphicsQueue, 1, &submitInfo, g_state.inFlightFences[g_state.currentFrame]) != VK_SUCCESS) {
        LOGE("Failed to submit draw command");
        return;
    }
    
    VkPresentInfoKHR presentInfo{};
    presentInfo.sType = VK_STRUCTURE_TYPE_PRESENT_INFO_KHR;
    presentInfo.waitSemaphoreCount = 1;
    presentInfo.pWaitSemaphores = signalSemaphores;
    presentInfo.swapchainCount = 1;
    presentInfo.pSwapchains = &g_state.swapchain;
    presentInfo.pImageIndices = &imageIndex;
    
    result = vkQueuePresentKHR(g_state.presentQueue, &presentInfo);
    
    if (result == VK_ERROR_OUT_OF_DATE_KHR || result == VK_SUBOPTIMAL_KHR || g_state.framebufferResized) {
        g_state.framebufferResized = true;
    }
    
    g_state.currentFrame = (g_state.currentFrame + 1) % g_state.imageAvailableSemaphores.size();
}

void initVulkan() {
    createInstance();
    if (!g_state.instance) return;
    
    createSurface();
    if (!g_state.surface) return;
    
    pickPhysicalDevice();
    if (!g_state.physicalDevice) return;
    
    createLogicalDevice();
    if (!g_state.device) return;
    
    createSwapchain();
    if (!g_state.swapchain) return;
    
    createRenderPass();
    if (!g_state.renderPass) return;
    
    createGraphicsPipeline();
    if (!g_state.pipeline) return;
    
    createFramebuffers();
    createCommandPool();
    createCommandBuffers();
    createSyncObjects();
    
    for (size_t i = 0; i < g_state.commandBuffers.size(); i++) {
        recordCommandBuffer(g_state.commandBuffers[i], i);
    }
    
    g_state.initialized = true;
    LOGI("Vulkan initialized successfully");
}

void cleanupVulkan() {
    vkDeviceWaitIdle(g_state.device);
    
    for (size_t i = 0; i < g_state.imageAvailableSemaphores.size(); i++) {
        vkDestroySemaphore(g_state.device, g_state.imageAvailableSemaphores[i], nullptr);
        vkDestroySemaphore(g_state.device, g_state.renderFinishedSemaphores[i], nullptr);
        vkDestroyFence(g_state.device, g_state.inFlightFences[i], nullptr);
    }
    
    vkDestroyCommandPool(g_state.device, g_state.commandPool, nullptr);
    
    for (auto fb : g_state.framebuffers) vkDestroyFramebuffer(g_state.device, fb, nullptr);
    vkDestroyPipeline(g_state.device, g_state.pipeline, nullptr);
    vkDestroyPipelineLayout(g_state.device, g_state.pipelineLayout, nullptr);
    vkDestroyRenderPass(g_state.device, g_state.renderPass, nullptr);
    
    for (auto view : g_state.swapchainImageViews) vkDestroyImageView(g_state.device, view, nullptr);
    vkDestroySwapchainKHR(g_state.device, g_state.swapchain, nullptr);
    
    vkDestroyDevice(g_state.device, nullptr);
    vkDestroySurfaceKHR(g_state.instance, g_state.surface, nullptr);
    vkDestroyInstance(g_state.instance, nullptr);
    
    g_state = {};
    LOGI("Vulkan cleaned up");
}

extern "C" void android_main(struct android_app* app) {
    g_app = app;
    app->onAppCmd = [](android_app* app, int32_t cmd) {
        switch (cmd) {
            case APP_CMD_INIT_WINDOW:
                if (app->window) {
                    initVulkan();
                }
                break;
            case APP_CMD_TERM_WINDOW:
                cleanupVulkan();
                break;
            case APP_CMD_GAINED_FOCUS:
                break;
            case APP_CMD_LOST_FOCUS:
                break;
        }
    };
    
    app->onInputEvent = nullptr;
    
    while (!app->destroyRequested) {
        int events;
        android_poll_source* source;
        while (ALooper_pollAll(g_state.initialized ? 0 : -1, nullptr, &events, (void**)&source) >= 0) {
            if (source) source->process(app, source);
        }
        
        if (g_state.initialized && app->window) {
            drawFrame();
        }
    }
    
    cleanupVulkan();
}