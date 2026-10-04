// Tags everything inside it as one interactable target for InteractionSystem.
export default function Interactable({ id, children, ...props }) {
  return (
    <group userData={{ interactable: id }} {...props}>
      {children}
    </group>
  )
}
