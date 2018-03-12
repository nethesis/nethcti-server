# nethcti.rb

Facter.add('nethcti') do
  confine :osfamily => 'RedHat'
  setcode do
    nethcti = {}
    tmp = Facter::Core::Execution.exec('curl http://localhost:8179/profiling/all 2> /dev/null')
    if ! tmp.empty?
        nethcti = JSON.parse(tmp)
    end

    nethcti
  end
end
