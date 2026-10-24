// Black Tide — code-driven bootstrap. Spawns the camera + game host when Play is
// pressed, so the project runs from any (even empty) scene with no manual wiring.
using UnityEngine;

namespace BlackTide.App
{
    public static class GameBoot
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        static void Boot()
        {
            // Camera so the game view clears to sea-blue (and no "no cameras" notice).
            var camGo = new GameObject("Black Tide Camera");
            var cam = camGo.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.039f, 0.078f, 0.11f);
            cam.orthographic = true;
            camGo.transform.position = new Vector3(0, 0, -10);
            Object.DontDestroyOnLoad(camGo);

            var hostGo = new GameObject("Black Tide");
            hostGo.AddComponent<GameHost>();
            Object.DontDestroyOnLoad(hostGo);
        }
    }
}
